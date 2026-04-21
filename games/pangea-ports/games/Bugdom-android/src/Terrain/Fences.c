/**********************/
/*   	FENCES.C      */
/**********************/


/***************/
/* EXTERNALS   */
/***************/

#include "game.h"


/****************************/
/*    PROTOTYPES            */
/****************************/

static void SubmitFence(int f, float camX, float camZ, uint16_t slot);


/****************************/
/*    CONSTANTS             */
/****************************/

#define MAX_FENCES			60
#define	MAX_NUBS_IN_FENCE	40

#define	NUM_FENCE_SHADERS	9


#define	FENCE_SINK_FACTOR	40.0f

enum
{
	FENCE_TYPE_THORN,
	FENCE_TYPE_WHEAT,
	FENCE_TYPE_GRASS,
	FENCE_TYPE_FOREST2,
	FENCE_TYPE_NIGHT,
	FENCE_TYPE_POND,
	FENCE_TYPE_MOSS,
	FENCE_TYPE_WOOD,
	FENCE_TYPE_HIVE
};


/**********************/
/*     VARIABLES      */
/**********************/

long			gNumFences = 0;
FenceDefType	*gFenceList = nil;

static Boolean					gIsFenceVisible[MAX_FENCES];
static TQ3TriMeshData*			gFenceSegmentMeshes[MAX_FENCES][MAX_NUBS_IN_FENCE - 1];
static RenderModifiers			gFenceRenderMods[MAX_FENCES];
static GLuint					gFenceTypeTextures[NUM_FENCE_SHADERS];


static Boolean gFenceOnThisLevel[NUM_LEVEL_TYPES][NUM_FENCE_SHADERS] =
{
	//			Hay										AntHill
	//	Thorn	weed	Grass	????	Night	Pond	moss	Wood	Hive
	{	1,		0,		1,		0,		0,		0,		0,		0,		0,		},	// LAWN
	{	0,		0,		1,		0,		0,		1,		0,		0,		0,		},	// POND
	{	0,		1,		0,		1,		0,		0,		0,		1,		0,		},	// FOREST
	{	0,		0,		0,		0,		0,		0,		0,		0,		1,		},	// HIVE
	{	0,		0,		0,		0,		1,		0,		0,		0,		0,		},	// NIGHT
	{	0,		0,		0,		0,		0,		0,		1,		0,		0,		},	// ANTHILL
};


float			gFenceHeight[NUM_FENCE_SHADERS] =
{
	600,			// thorn
	1000,			// wheat
	1000,			// grass
	500,			// ????
	1000,			// night
	2000,			// pond
	200,			// moss
	6000,			// wood
	1200,			// hive
};

double			gFenceTextureW[NUM_FENCE_SHADERS] =		// smaller denom == smaller width
{
	1.0f/600.0f,			// thorn
	1.0f/500.0f,			// wheat
	1.0f/500.0f,			// grass
	1.0f/500.0f,			// ????
	1.0f/500.0f,			// night
	1.0f/500.0f,			// pond
	1.0f/500.0f,			// moss
	1.0f/1000.0f,			// wood
	1.0f/1200.0f,			// hive
};

Boolean			gFenceUsesNullShader[NUM_FENCE_SHADERS] =
{
	true,			// thorn
	true,			// wheat
	true,			// grass
	true,			// ????
	true,			// night
	true,			// pond
	false,			// moss
	true,			// wood
	true			// hive
};


/******************** INIT FENCE MANAGER ***********************/
//
// Called once at boot
//

void InitFenceManager(void)
{
	for (int i = 0; i < NUM_FENCE_SHADERS; i++)
	{
		gFenceTypeTextures[i] = 0;
	}

	for (int f = 0; f < MAX_FENCES; f++)
	{
		for (int s = 0; s < MAX_NUBS_IN_FENCE - 1; s++)
			gFenceSegmentMeshes[f][s] = nil;

		Render_SetDefaultModifiers(&gFenceRenderMods[f]);
		gFenceRenderMods[f].drawOrder = kDrawOrder_Default;
	}
}

/******************** DISPOSE FENCE SHADERS ********************/

void DisposeFences(void)
{
			/* DISPOSE OLD SHADER ATTRIBS */

	for (int i = 0; i < NUM_FENCE_SHADERS; i++)
	{
		if (gFenceTypeTextures[i])
		{
			glDeleteTextures(1, &gFenceTypeTextures[i]);
			gFenceTypeTextures[i] = 0;
		}
	}

			/* DISPOSE FENCE MESHES */

	for (int f = 0; f < MAX_FENCES; f++)
	{
		for (int s = 0; s < MAX_NUBS_IN_FENCE - 1; s++)
		{
			if (gFenceSegmentMeshes[f][s] != nil)
			{
				Q3TriMeshData_Dispose(gFenceSegmentMeshes[f][s]);
				gFenceSegmentMeshes[f][s] = nil;
			}
		}
	}
}


/********************* PRIME FENCES ***********************/
//
// Called during terrain prime function to initialize 
//

void PrimeFences(void)
{
long					f,i,numNubs;
FenceDefType			*fence;
FencePointType			*nubs;

	GAME_ASSERT(gNumFences <= MAX_FENCES);


			/* DISPOSE OLD SHADER ATTRIBS */

	DisposeFences();


			/******************************/
			/* ADJUST TO GAME COORDINATES */
			/******************************/
			// (Coordinates are now pre-calculated in File.c)

	for (f = 0; f < gNumFences; f++)
	{
		gIsFenceVisible[f] = false;							// assume invisible
		fence = &gFenceList[f];								// point to this fence
		HLockHi((Handle)fence->nubList);
		nubs = (*fence->nubList);							// point to nub list
		numNubs = fence->numNubs;							// get # nubs in fence
		
		GAME_ASSERT(numNubs != 1);

		GAME_ASSERT(numNubs <= MAX_NUBS_IN_FENCE);

		
		/* CALCULATE VECTOR FOR EACH SECTION */
		
		fence->sectionVectors = (TQ3Vector2D *)AllocPtr(sizeof(TQ3Vector2D) * (numNubs-1));
		GAME_ASSERT(fence->sectionVectors);

		for (i = 0; i < (numNubs-1); i++)
		{
			float	dx,dz;
			
			dx = nubs[i+1].x - nubs[i].x;
			dz = nubs[i+1].z - nubs[i].z;
			
			FastNormalizeVector2D(dx, dz, &fence->sectionVectors[i]);		
		}
		
	}
	
			/***********************************************************/
			/* LOAD FENCE SHADER TEXTURES & CONVERT INTO ATTRIBUTE SET */
			/***********************************************************/

	for (i = 0; i < NUM_FENCE_SHADERS; i++)
	{
		if (gFenceOnThisLevel[gLevelType][i])										// see if this fence exists on this level
		{
			// Create texture from :Data:Images:Textures:200X.tga.
			// Clamp texture vertically to avoid ugly line at top.
			gFenceTypeTextures[i] = QD3D_LoadTextureFile(2000 + i, kRendererTextureFlags_SolidBlackIsAlpha | kRendererTextureFlags_ClampV);	// create shader object
			GAME_ASSERT(gFenceTypeTextures[i]);
		}
		else
		{
			gFenceTypeTextures[i] = 0;
		}
	}

			/*****************************/
			/* SETUP COMMON TRIMESH INFO */
			/*****************************/

	for (f = 0; f < MAX_FENCES; f++)
	{
		for (int s = 0; s < MAX_NUBS_IN_FENCE - 1; s++)
		{
			TQ3TriMeshData* tmd = Q3TriMeshData_New(
					2,	// 2 triangles per segment
					4,	// 4 points per segment
					kQ3TriMeshDataFeatureVertexUVs | kQ3TriMeshDataFeatureVertexColors | kQ3TriMeshDataFeatureVertexNormals
			);

			gFenceSegmentMeshes[f][s] = tmd;

			if (gDoAutoFade)
				tmd->texturingMode = kQ3TexturingModeAlphaBlend;		// Required for autofaded fences!
			else
				tmd->texturingMode = kQ3TexturingModeAlphaTest;

					/* PREBUILD TRIANGLE INFO */

			tmd->triangles[0].pointIndices[0] = 1;
			tmd->triangles[0].pointIndices[1] = 0;
			tmd->triangles[0].pointIndices[2] = 3;

			tmd->triangles[1].pointIndices[0] = 3;
			tmd->triangles[1].pointIndices[1] = 0;
			tmd->triangles[1].pointIndices[2] = 2;
		}
	}
}


/********************* DRAW FENCES ***********************/

void DrawFences(const QD3DSetupOutputType *setupInfo)
{
long			row,col,numNubs,type;
FencePointType	*nubs;
float			cameraX, cameraZ;

			/* GET CAMERA COORDS */

	cameraX = setupInfo->currentCameraCoords.x;
	cameraZ = setupInfo->currentCameraCoords.z;


			/*******************/
			/* DRAW EACH FENCE */
			/*******************/			

	for (int f = 0; f < gNumFences; f++)
	{
		type = gFenceList[f].type;							// get type

			/* VERIFY THAT THIS FENCE TYPE EXISTS ON THIS LEVEL */

		if (!gFenceOnThisLevel[gLevelType][type])
		{
			DoAlert("DrawFences: illegal fence type for this level! (%d)", gFenceList[f].type);
		}

			/* SEE IF THIS FENCE IS VISIBLE AT ALL */
			
		numNubs = gFenceList[f].numNubs;
		nubs = *gFenceList[f].nubList;
		
		for (int n = 0; n < numNubs; n++)
		{
			row = nubs[n].z / TERRAIN_SUPERTILE_UNIT_SIZE;	// calc supertile row,col
			col = nubs[n].x / TERRAIN_SUPERTILE_UNIT_SIZE;
			
			if (gTerrainScrollBuffer[row][col] != EMPTY_SUPERTILE)
				goto drawit;
		}
		gIsFenceVisible[f] = false;
		continue;											// not visible, so skip it
		
				/*********************/
				/* SUBMIT THIS FENCE */
				/*********************/
drawit:	
		gIsFenceVisible[f] = true;

				/* SET TAGS */

		gFenceRenderMods[f].statusBits = STATUS_BIT_KEEPBACKFACES;

		if (gFenceUsesNullShader[type])		// see if null illumination rather than lambert shading
		{
			gFenceRenderMods[f].statusBits |= STATUS_BIT_NULLSHADER;
		}

				/* SUBMIT GEOMETRY */

		SubmitFence(f, cameraX, cameraZ, f);
	}
}


#pragma mark -

/******************** DO FENCE COLLISION **************************/
//
// INPUT:	radiusScale = tweak amount to scale radius by
//

void DoFenceCollision(ObjNode *theNode, float radiusScale)
{
double			fromX,fromZ,toX,toZ;
long			f,numFenceSegments,i,numReScans;
double			segFromX,segFromZ,segToX,segToZ;
FencePointType	*nubs;
Boolean			intersected,letGoOver;
double			intersectX,intersectZ;
TQ3Vector2D		lineNormal;
double			radius;
double			oldX,oldZ,newX,newZ;

	if (gNoFenceCollision)			// fence collision disabled (cheat/dev mode)
		return;

	letGoOver = false;

			/* CALC MY MOTION LINE SEGMENT */
			
	oldX = theNode->OldCoord.x;						// from old coord
	oldZ = theNode->OldCoord.z;
	newX = gCoord.x;								// to new coord
	newZ = gCoord.z;
	radius = theNode->BoundingSphere.radius * radiusScale;



			/****************************************/
			/* SCAN THRU ALL FENCES FOR A COLLISION */
			/****************************************/
			
	for (f = 0; f < gNumFences; f++)
	{
		float	temp;
		int		type;
		
		if (!gIsFenceVisible[f])						// dont collide if it isnt visible
			continue;
			

				/* SPECIAL STUFF */
				
		type = gFenceList[f].type;
		switch(type)
		{
			case	FENCE_TYPE_WHEAT:					// things can go over this
			case	FENCE_TYPE_FOREST2:	
					letGoOver = true;
					break;
					
			case	FENCE_TYPE_MOSS:					// this isnt solid
					goto next_fence;
		}
			
			
		/* QUICK CHECK TO SEE IF OLD & NEW COORDS (PLUS RADIUS) ARE OUTSIDE OF FENCE'S BBOX */
#if 1	
		temp = gFenceList[f].bBox.left - radius;
		if ((oldX < temp) && (newX < temp))
			continue;
		temp = gFenceList[f].bBox.right + radius;
		if ((oldX > temp) && (newX > temp))
			continue;
			
		temp = gFenceList[f].bBox.top - radius;
		if ((oldZ < temp) && (newZ < temp))
			continue;
		temp = gFenceList[f].bBox.bottom + radius;
		if ((oldZ > temp) && (newZ > temp))
			continue;
#endif			
			
		nubs = *gFenceList[f].nubList;				// point to nub list
		numFenceSegments = gFenceList[f].numNubs-1;	// get # line segments in fence
		
				/**********************************/
				/* SCAN EACH SECTION OF THE FENCE */
				/**********************************/
			
		numReScans = 0;	
		for (i = 0; i < numFenceSegments; i++)
		{
					/* GET LINE SEG ENDPOINTS */
					
			segFromX = nubs[i].x;
			segFromZ = nubs[i].z;
			segToX = nubs[i+1].x;
			segToZ = nubs[i+1].z;				
	
	
					/* SEE IF ROUGHLY CAN GO OVER */
					
			if (letGoOver)
			{
				float y = GetTerrainHeightAtCoord(segFromX,segFromZ,FLOOR) + gFenceHeight[type];			
				if ((gCoord.y + theNode->BottomOff) >= y)
					continue;
			}
	
	
					/* CALC NORMAL TO THE LINE */
					//
					// We need to find the point on the bounding sphere which is closest to the line
					// in order to do good collision checks
					//
					
			CalcRayNormal2D(&gFenceList[f].sectionVectors[i], segFromX, segFromZ,
							 oldX, oldZ, &lineNormal);
	
	
					/* CALC FROM-TO POINTS OF MOTION */
					
			fromX = oldX; // - (lineNormal.x * radius);
			fromZ = oldZ; // - (lineNormal.y * radius);
			toX = newX - (lineNormal.x * radius);
			toZ = newZ - (lineNormal.y * radius);
			
	
					/* SEE IF THE LINES INTERSECT */
					
			intersected = IntersectLineSegments(fromX,  fromZ, toX, toZ,
						                     segFromX, segFromZ, segToX, segToZ,
				                             &intersectX, &intersectZ);

			if (intersected)
			{				
						/***************************/
						/* HANDLE THE INTERSECTION */
						/***************************/
						//
						// Move so edge of sphere would be tangent, but also a bit
						// farther so it isnt tangent.
						//
											
				gCoord.x = intersectX + lineNormal.x*radius + (lineNormal.x*2.0);
				gCoord.z = intersectZ + lineNormal.y*radius + (lineNormal.y*2.0);
				
					
						/* BOUNCE OFF WALL */
				
				{
					TQ3Vector2D deltaV;
					
					deltaV.x = gDelta.x;
					deltaV.y = gDelta.z;		
					ReflectVector2D(&deltaV, &lineNormal);
					gDelta.x = deltaV.x * .8f;
					gDelta.z = deltaV.y * .8f;
				}					
				
						/* UPDATE COORD & SCAN AGAIN */
						
				newX = gCoord.x;
				newZ = gCoord.z;
				if (++numReScans < 5)
					i = -1;							// reset segment index to scan all again (reset to -1 because for loop will auto-inc to 0 for us)
			}
			
			/**********************************************/			
			/* NO INTERSECT, DO SAFETY CHECK FOR /\ CASES */
			/**********************************************/
			//
			// The above check may fail when the sphere is going thru
			// the tip of a tee pee /\ intersection, so this is a hack
			// to get around it.
			//			
						
			else
			{
					/* SEE IF EITHER ENDPOINT IS IN SPHERE */
					
				if ((CalcQuickDistance(segFromX, segFromZ, newX, newZ) <= radius) ||
					(CalcQuickDistance(segToX, segToZ, newX, newZ) <= radius))
				{
					TQ3Vector2D deltaV;
					
					gCoord.x = oldX;
					gCoord.z = oldZ;
					
						/* BOUNCE OFF WALL */
				
					deltaV.x = gDelta.x;
					deltaV.y = gDelta.z;		
					ReflectVector2D(&deltaV, &lineNormal);
					gDelta.x = deltaV.x * .8f;
					gDelta.z = deltaV.y * .8f;
					return;
				}
				else
					continue;
			}
		} // for i
next_fence:;
	}
}


/******************** SUBMIT FENCE **************************/
//
// Visibility checks have already been done, so there's a good chance the fence is visible
//

static void SubmitFence(int f, float camX, float camZ, uint16_t slot)
{
	u_short					type;
	float					u,height;
	long					i,numNubs;
	FenceDefType			*fence;
	FencePointType			*nubs;

			/* GET FENCE INFO */

	fence = &gFenceList[f];								// point to this fence
	nubs = (*fence->nubList);							// point to nub list
	numNubs = fence->numNubs;							// get # nubs in fence

	type = fence->type;									// get fence type
	GAME_ASSERT_MESSAGE(type < NUM_FENCE_SHADERS, "illegal fence type");

	switch(type)
	{
		case	FENCE_TYPE_MOSS:
				height = -gFenceHeight[type];						// get height
				break;

		default:
				height = gFenceHeight[type];
	}

	u = 0;

	for (i = 0; i < numNubs-1; i++)
	{
		TQ3TriMeshData* tmd = gFenceSegmentMeshes[f][i];

		tmd->glTextureName = gFenceTypeTextures[type];
		tmd->hasVertexColors = gDoAutoFade;

		// Get coords for this segment's two nubs
		float x0 = nubs[i].x;
		float z0 = nubs[i].z;
		float x1 = nubs[i+1].x;
		float z1 = nubs[i+1].z;

		float y0, y0_top, y1, y1_top;

		switch(type)
		{
			case	FENCE_TYPE_MOSS:
					y0 = GetTerrainHeightAtCoord(x0, z0, CEILING) + FENCE_SINK_FACTOR;
					y0_top = y0 + height;
					y1 = GetTerrainHeightAtCoord(x1, z1, CEILING) + FENCE_SINK_FACTOR;
					y1_top = y1 + height;
					break;

			case	FENCE_TYPE_WOOD:
					y0 = y1 = -400;
					y0_top = y1_top = y0 + height;
					break;

			case	FENCE_TYPE_HIVE:
					y0 = GetTerrainHeightAtCoord(x0, z0, FLOOR) - FENCE_SINK_FACTOR;
					y0_top = GetTerrainHeightAtCoord(x0, z0, CEILING) + FENCE_SINK_FACTOR;
					y1 = GetTerrainHeightAtCoord(x1, z1, FLOOR) - FENCE_SINK_FACTOR;
					y1_top = GetTerrainHeightAtCoord(x1, z1, CEILING) + FENCE_SINK_FACTOR;
					break;

			default:
					y0 = GetTerrainHeightAtCoord(x0, z0, FLOOR) - FENCE_SINK_FACTOR;
					y0_top = y0 + height;
					y1 = GetTerrainHeightAtCoord(x1, z1, FLOOR) - FENCE_SINK_FACTOR;
					y1_top = y1 + height;
		}

		// Set points
		tmd->points[0] = (TQ3Point3D){x0, y0, z0};
		tmd->points[1] = (TQ3Point3D){x0, y0_top, z0};
		tmd->points[2] = (TQ3Point3D){x1, y1, z1};
		tmd->points[3] = (TQ3Point3D){x1, y1_top, z1};

		// Update bbox
		tmd->bBox.isEmpty = false;
		tmd->bBox.min.x = SDL_min(x0, x1);
		tmd->bBox.max.x = SDL_max(x0, x1);
		tmd->bBox.min.y = SDL_min(SDL_min(y0, y0_top), SDL_min(y1, y1_top));
		tmd->bBox.max.y = SDL_max(SDL_max(y0, y0_top), SDL_max(y1, y1_top));
		tmd->bBox.min.z = SDL_min(z0, z1);
		tmd->bBox.max.z = SDL_max(z0, z1);

				// UVs
		float nextU = u + Q3Point3D_Distance(&tmd->points[0], &tmd->points[2]) * gFenceTextureW[type];
		tmd->vertexUVs[0] = (TQ3Param2D){u, 1};
		tmd->vertexUVs[1] = (TQ3Param2D){u, 0};
		tmd->vertexUVs[2] = (TQ3Param2D){nextU, 1};
		tmd->vertexUVs[3] = (TQ3Param2D){nextU, 0};
		u = nextU;

		// Vertex Colors (Autofade)
		if (gDoAutoFade)
		{
			float dist0 = CalcQuickDistance(camX, camZ, x0, z0);
			float fade0 = (dist0 < gAutoFadeStartDist) ? 1.0f : SDL_max(0.0f, 1.0f - (dist0 - gAutoFadeStartDist) / AUTO_FADE_RANGE);
			tmd->vertexColors[0].a = tmd->vertexColors[1].a = fade0;

			float dist1 = CalcQuickDistance(camX, camZ, x1, z1);
			float fade1 = (dist1 < gAutoFadeStartDist) ? 1.0f : SDL_max(0.0f, 1.0f - (dist1 - gAutoFadeStartDist) / AUTO_FADE_RANGE);
			tmd->vertexColors[2].a = tmd->vertexColors[3].a = fade1;
		}

		// Normals (Gouraud)
		if (gFenceUsesNullShader[type])
		{
			tmd->hasVertexNormals = false;
		}
		else
		{
			tmd->hasVertexNormals = true;
			float faceNormalX = -(z1 - z0);
			float faceNormalZ = -(x1 - x0);
			TQ3Vector3D normal = {faceNormalX, 0, faceNormalZ};
			Q3Vector3D_Normalize(&normal, &normal);
			tmd->vertexNormals[0] = tmd->vertexNormals[1] = tmd->vertexNormals[2] = tmd->vertexNormals[3] = normal;
		}

		// Submit this segment
		Render_SubmitMesh(tmd, nil, &gFenceRenderMods[f], nil, slot);
	}
}
