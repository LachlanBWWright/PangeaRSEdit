/****************************/
/*      LOAD LEVEL.C        */
/* (c)2002 Pangea Software  */
/* By Brian Greenstone      */
/****************************/


/***************/
/* EXTERNALS   */
/***************/

#include "game.h"

/****************************/
/*    PROTOTYPES            */
/****************************/

static void MakeTerrainSpec(FSSpec *spec, const char *defaultRelPath);


/****************************/
/*    CONSTANTS             */
/****************************/


/**********************/
/*     VARIABLES      */
/**********************/


/***************** MAKE TERRAIN SPEC ***********************/
//
// Build an FSSpec for a terrain file.
// If gDirectTerrainPath is set, use that path instead of the bundled default.
//

static void MakeTerrainSpec(FSSpec *spec, const char *defaultRelPath)
{
	if (gDirectTerrainPath[0] != '\0')
	{
		// Use the overridden terrain file (e.g. supplied by level editor via WebAssembly)
		OSErr err = FSMakeFSSpec(gDataSpec.vRefNum, gDataSpec.parID, gDirectTerrainPath, spec);
		if (err == noErr)
			return;
		SDL_LogWarn(SDL_LOG_CATEGORY_APPLICATION,
					"MakeTerrainSpec: custom terrain '%s' not found (err=%d), using default '%s'",
					gDirectTerrainPath, (int)err, defaultRelPath);
	}

	FSMakeFSSpec(gDataSpec.vRefNum, gDataSpec.parID, defaultRelPath, spec);
}



/************************** LOAD DUEL ART ***************************/

void LoadDuelArt(void)
{
FSSpec	spec;



			/*********************/
			/* LOAD COMMNON DATA */
			/*********************/


			/* LOAD GLOBAL BG3D GEOMETRY */
			
	FSMakeFSSpec(gDataSpec.vRefNum, gDataSpec.parID, ":Models:global.bg3d", &spec);
	ImportBG3D(&spec, MODEL_GROUP_GLOBAL);


			/* LOAD LEVEL BG3D */
			
	switch(gCurrentArea)
	{
		case	AREA_TOWN_DUEL1:
		case	AREA_TOWN_DUEL2:
		case	AREA_TOWN_DUEL3:
				FSMakeFSSpec(gDataSpec.vRefNum, gDataSpec.parID, ":Models:town.bg3d", &spec);
				ImportBG3D(&spec, MODEL_GROUP_LEVELSPECIFIC);

				FSMakeFSSpec(gDataSpec.vRefNum, gDataSpec.parID, ":Models:buildings.bg3d", &spec);
				ImportBG3D(&spec, MODEL_GROUP_BUILDINGS);
				break;
				
		case	AREA_SWAMP_DUEL1:
		case	AREA_SWAMP_DUEL2:
		case	AREA_SWAMP_DUEL3:
				FSMakeFSSpec(gDataSpec.vRefNum, gDataSpec.parID, ":Models:swamp.bg3d", &spec);
				ImportBG3D(&spec, MODEL_GROUP_LEVELSPECIFIC);
				
	}


			/* LOAD SPRITES */
			
	LoadSpriteGroup(SPRITE_GROUP_INFOBAR);
	LoadSpriteGroup(SPRITE_GROUP_GLOBAL);
	LoadSpriteGroup(SPRITE_GROUP_SPHEREMAPS);
	LoadSpriteGroup(SPRITE_GROUP_FONT);
	LoadSpriteGroup(SPRITE_GROUP_DUEL);


			/* LOAD PLAYER SKELETON */
			
	LoadASkeleton(SKELETON_TYPE_BILLY);
	LoadASkeleton(SKELETON_TYPE_BANDITO);
	LoadASkeleton(SKELETON_TYPE_RYGAR);
	LoadASkeleton(SKELETON_TYPE_SHORTY);




			/* LOAD TERRAIN */
			//
			// must do this after creating the view!
			//
			
	switch(gCurrentArea)
	{
		case	AREA_TOWN_DUEL1:
		case	AREA_TOWN_DUEL2:
		case	AREA_TOWN_DUEL3:
				MakeTerrainSpec(&spec, ":Terrain:town_duel.ter");
				break;
				
		case	AREA_SWAMP_DUEL1:
		case	AREA_SWAMP_DUEL2:
		case	AREA_SWAMP_DUEL3:
				MakeTerrainSpec(&spec, ":Terrain:swamp_duel.ter");
				break;
	}
	
	LoadPlayfield(&spec);

}


/************************** LOAD SHOOTOUT ART ***************************/

void LoadShootoutArt(void)
{
FSSpec	spec;



			/*********************/
			/* LOAD COMMNON DATA */
			/*********************/
				

			/* LOAD GLOBAL BG3D GEOMETRY */
			
	FSMakeFSSpec(gDataSpec.vRefNum, gDataSpec.parID, ":Models:global.bg3d", &spec);
	ImportBG3D(&spec, MODEL_GROUP_GLOBAL);


	switch(gCurrentArea)
	{
		case	AREA_TOWN_SHOOTOUT:
				FSMakeFSSpec(gDataSpec.vRefNum, gDataSpec.parID, ":Models:town.bg3d", &spec);
				ImportBG3D(&spec, MODEL_GROUP_LEVELSPECIFIC);

				FSMakeFSSpec(gDataSpec.vRefNum, gDataSpec.parID, ":Models:buildings.bg3d", &spec);
				ImportBG3D(&spec, MODEL_GROUP_BUILDINGS);
				break;
				
		case	AREA_SWAMP_SHOOTOUT:
				FSMakeFSSpec(gDataSpec.vRefNum, gDataSpec.parID, ":Models:swamp.bg3d", &spec);
				ImportBG3D(&spec, MODEL_GROUP_LEVELSPECIFIC);
				break;
	}


			/* LOAD SPRITES */
			
	LoadSpriteGroup(SPRITE_GROUP_INFOBAR);
	LoadSpriteGroup(SPRITE_GROUP_GLOBAL);
	LoadSpriteGroup(SPRITE_GROUP_SPHEREMAPS);
	LoadSpriteGroup(SPRITE_GROUP_CURSOR);
	LoadSpriteGroup(SPRITE_GROUP_FONT);


			/* LOAD PLAYER SKELETON */
			
	LoadASkeleton(SKELETON_TYPE_BILLY);

	switch(gCurrentArea)
	{
		case	AREA_TOWN_SHOOTOUT:
				LoadASkeleton(SKELETON_TYPE_BANDITO);
				LoadASkeleton(SKELETON_TYPE_SHORTY);
				LoadASkeleton(SKELETON_TYPE_WALKER);
				LoadASkeleton(SKELETON_TYPE_KANGACOW);
				break;
			
		case	AREA_SWAMP_SHOOTOUT:
				LoadASkeleton(SKELETON_TYPE_KANGAREX);
				LoadASkeleton(SKELETON_TYPE_TREMORALIEN);
				LoadASkeleton(SKELETON_TYPE_TREMORGHOST);
				LoadASkeleton(SKELETON_TYPE_FROGMAN);
				LoadASkeleton(SKELETON_TYPE_BANDITO);
				LoadASkeleton(SKELETON_TYPE_SHORTY);
				break;
				
	}



			/* LOAD TERRAIN */
			//
			// must do this after creating the view!
			//
			
	switch(gCurrentArea)
	{
		case	AREA_TOWN_SHOOTOUT:
				MakeTerrainSpec(&spec, ":Terrain:town_shootout.ter");
				break;

		case	AREA_SWAMP_SHOOTOUT:
				MakeTerrainSpec(&spec, ":Terrain:swamp_shootout.ter");
				break;
	}

	LoadPlayfield(&spec);
	
	
	BG3D_SphereMapGeomteryMaterial(MODEL_GROUP_GLOBAL, GLOBAL_ObjType_PesoPOW,
								0, MULTI_TEXTURE_COMBINE_ADD, SPHEREMAP_SObjType_Sheen);			
}


/************************** LOAD STAMPEDE ART ***************************/

void LoadStampedeArt(void)
{
FSSpec	spec;



			/*********************/
			/* LOAD COMMNON DATA */
			/*********************/
				

			/* LOAD LEVEL BG3D */
			
	switch(gCurrentArea)
	{
		case	AREA_TOWN_STAMPEDE:
				FSMakeFSSpec(gDataSpec.vRefNum, gDataSpec.parID, ":Models:town.bg3d", &spec);
				break;			

		case	AREA_SWAMP_STAMPEDE:
				FSMakeFSSpec(gDataSpec.vRefNum, gDataSpec.parID, ":Models:swamp.bg3d", &spec);
				break;			
	}
	ImportBG3D(&spec, MODEL_GROUP_LEVELSPECIFIC);


			/* LOAD GLOBAL BG3D GEOMETRY */
			
	FSMakeFSSpec(gDataSpec.vRefNum, gDataSpec.parID, ":Models:global.bg3d", &spec);
	ImportBG3D(&spec, MODEL_GROUP_GLOBAL);

	BG3D_SphereMapGeomteryMaterial(MODEL_GROUP_GLOBAL, GLOBAL_ObjType_Boost,
								0, MULTI_TEXTURE_COMBINE_ADD, SPHEREMAP_SObjType_Sheen);			


			/* LOAD SPRITES */

	LoadSpriteGroup(SPRITE_GROUP_INFOBAR);
	LoadSpriteGroup(SPRITE_GROUP_GLOBAL);
	LoadSpriteGroup(SPRITE_GROUP_SPHEREMAPS);
	LoadSpriteGroup(SPRITE_GROUP_STAMPEDE);
	LoadSpriteGroup(SPRITE_GROUP_FONT);


			/* LOAD PLAYER SKELETON */
						
	LoadASkeleton(SKELETON_TYPE_BILLY);
	
	switch(gCurrentArea)
	{
		case	AREA_TOWN_STAMPEDE:
				LoadASkeleton(SKELETON_TYPE_KANGACOW);
				break;			

		case	AREA_SWAMP_STAMPEDE:
				LoadASkeleton(SKELETON_TYPE_KANGAREX);
				break;			
	}
	




			/* LOAD TERRAIN */
			//
			// must do this after creating the view!
			//
			
	switch(gCurrentArea)
	{
		case	AREA_TOWN_STAMPEDE:
				MakeTerrainSpec(&spec, ":Terrain:town_stampede.ter");
				break;
				
		case	AREA_SWAMP_STAMPEDE:
				MakeTerrainSpec(&spec, ":Terrain:swamp_stampede.ter");
				break;
	}

	LoadPlayfield(&spec);



	BG3D_SphereMapGeomteryMaterial(MODEL_GROUP_GLOBAL, GLOBAL_ObjType_PesoPOW,
								0, MULTI_TEXTURE_COMBINE_ADD, SPHEREMAP_SObjType_Sheen);			

	BG3D_SphereMapGeomteryMaterial(MODEL_GROUP_GLOBAL, GLOBAL_ObjType_Boost,
								0, MULTI_TEXTURE_COMBINE_ADD, SPHEREMAP_SObjType_Sheen);			
}




/************************** LOAD TARGET PRACTICE ART ***************************/

void LoadTargetPracticeArt(void)
{
FSSpec	spec;



			/*********************/
			/* LOAD COMMNON DATA */
			/*********************/

			/* LOAD GLOBAL BG3D GEOMETRY */
			
	FSMakeFSSpec(gDataSpec.vRefNum, gDataSpec.parID, ":Models:global.bg3d", &spec);
	ImportBG3D(&spec, MODEL_GROUP_GLOBAL);

	FSMakeFSSpec(gDataSpec.vRefNum, gDataSpec.parID, ":Models:targetpractice.bg3d", &spec);
	ImportBG3D(&spec, MODEL_GROUP_LEVELSPECIFIC);



			/* LOAD SPRITES */
			
	LoadSpriteGroup(SPRITE_GROUP_INFOBAR);
	LoadSpriteGroup(SPRITE_GROUP_GLOBAL);
	LoadSpriteGroup(SPRITE_GROUP_SPHEREMAPS);
	LoadSpriteGroup(SPRITE_GROUP_CURSOR);
	LoadSpriteGroup(SPRITE_GROUP_FONT);


			/* LOAD PLAYER SKELETON */
	
	if (gCurrentArea == AREA_TARGETPRACTICE1)
	{			
		LoadASkeleton(SKELETON_TYPE_KANGACOW);
		LoadASkeleton(SKELETON_TYPE_SHORTY);
	}
	else
	{
		LoadASkeleton(SKELETON_TYPE_FROGMAN);
		LoadASkeleton(SKELETON_TYPE_TREMORGHOST);
	}


	BG3D_SphereMapGeomteryMaterial(MODEL_GROUP_GLOBAL, GLOBAL_ObjType_Boost,
								0, MULTI_TEXTURE_COMBINE_ADD, SPHEREMAP_SObjType_Sheen);			

	BG3D_SphereMapGeomteryMaterial(MODEL_GROUP_GLOBAL, GLOBAL_ObjType_PesoPOW,
								0, MULTI_TEXTURE_COMBINE_ADD, SPHEREMAP_SObjType_Sheen);			

	BG3D_SphereMapGeomteryMaterial(MODEL_GROUP_LEVELSPECIFIC, PRACTICE_ObjType_Bottle,
								0, MULTI_TEXTURE_COMBINE_ADD, SPHEREMAP_SObjType_Sheen);			

	BG3D_SphereMapGeomteryMaterial(MODEL_GROUP_LEVELSPECIFIC, PRACTICE_ObjType_DeathSkull,
								0, MULTI_TEXTURE_COMBINE_ADD, SPHEREMAP_SObjType_Satin);
}



