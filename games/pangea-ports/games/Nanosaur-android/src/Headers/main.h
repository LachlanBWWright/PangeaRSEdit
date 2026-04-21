//
// main.h
//

enum
{
	LEVEL_NUM_0
};

//=================================================

void ToolBoxInit(void);
void GameMain(void);

extern Boolean	gSkipToLevel;
extern int		gStartLevelNum;
extern char		gCustomTerrainFile[512];
extern Boolean	gFenceCollisionsDisabled;

