if(ANDROID)
    # The production overlay uses GLES 3 symbols even in ports still linking GLESv2.
    link_libraries(GLESv3)
    if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
        # Ports cache SDL's binary path after configuration; reset its source on reruns.
        set(screenshot_sdl_source "${CMAKE_SOURCE_DIR}/extern/SDL")
        if(NOT EXISTS "${screenshot_sdl_source}/CMakeLists.txt")
            set(screenshot_sdl_source "${CMAKE_SOURCE_DIR}/extern/SDL3-3.2.8")
        endif()
        set(SDL3_DIR "${screenshot_sdl_source}" CACHE PATH "" FORCE)
        set(SDL3_DIR "${screenshot_sdl_source}")
        list(PREPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_LIST_DIR}/cmake")
        function(pangea_screenshot_launcher)
            if(DEFINED GAME_TARGET AND TARGET "${GAME_TARGET}")
                get_target_property(game_sources "${GAME_TARGET}" SOURCES)
                foreach(game_source IN LISTS game_sources)
                    if(game_source MATCHES "[/\\\\]Input\\.c$")
                        set_property(SOURCE "${game_source}" APPEND PROPERTY
                            COMPILE_DEFINITIONS PANGEA_TOUCH_IMPLEMENTATION)
                    endif()
                endforeach()
                list(FILTER game_sources EXCLUDE REGEX "TouchControlsDraw\\.c$")
                set_property(TARGET "${GAME_TARGET}" PROPERTY SOURCES "${game_sources}")
                target_sources("${GAME_TARGET}" PRIVATE
                    "${PANGEA_TOUCH_CONTROLS_ROOT}/TouchControlsDraw.c"
                    "${CMAKE_CURRENT_FUNCTION_LIST_DIR}/working-directory.c")
                target_include_directories("${GAME_TARGET}" PRIVATE
                    "${PANGEA_TOUCH_CONTROLS_ROOT}" "${CMAKE_SOURCE_DIR}/../../shared/android")
                target_compile_options("${GAME_TARGET}" PRIVATE
                    "-include${PANGEA_TOUCH_CONTROLS_ROOT}/TouchControls.h")
                add_library(PangeaTouchScreenshot SHARED
                    "${CMAKE_CURRENT_FUNCTION_LIST_DIR}/controls-preview.c"
                    "${PANGEA_TOUCH_CONTROLS_ROOT}/TouchControlsDraw.c")
                target_include_directories(PangeaTouchScreenshot PRIVATE
                    "${PANGEA_TOUCH_CONTROLS_ROOT}" "${CMAKE_SOURCE_DIR}/../../shared/android")
                target_compile_options(PangeaTouchScreenshot PRIVATE
                    "-include${PANGEA_TOUCH_CONTROLS_ROOT}/TouchControls.h")
                target_link_libraries(PangeaTouchScreenshot PRIVATE
                    SDL3::SDL3-static GLESv3 EGL android log m)
            endif()
        endfunction()
        cmake_language(DEFER CALL pangea_screenshot_launcher)
    endif()
endif()
