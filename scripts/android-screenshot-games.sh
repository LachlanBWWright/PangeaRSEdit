#!/usr/bin/env bash

android_screenshot_game() {
  case "$1" in
    BillyFrontier-Android) game_package=io.jor.billyfrontier; game_library=BillyFrontier; game_arguments=--level,1 ;;
    Bugdom-android) game_package=io.jor.bugdom; game_library=Bugdom; game_arguments=--level,0 ;;
    Bugdom2-Android) game_package=io.jor.bugdom2; game_library=Bugdom2; game_arguments=--level,0 ;;
    CroMagRally-Android) game_package=io.jor.cromagrally; game_library=CroMagRally; game_arguments=--track,0,--car,0 ;;
    MightyMike-Android) game_package=io.jor.mightymike; game_library=MightyMike; game_arguments=--level,0:1 ;;
    Nanosaur-android) game_package=io.jor.nanosaur; game_library=Nanosaur; game_arguments=--level,0,--skip-menu ;;
    Nanosaur2-Android) game_package=io.jor.nanosaur2; game_library=Nanosaur2; game_arguments=--level,0 ;;
    OttoMatic-Android) game_package=io.jor.ottomatic; game_library=OttoMatic; game_arguments=--level,0 ;;
    *) echo "Unknown Android screenshot game: $1" >&2; return 1 ;;
  esac
}
