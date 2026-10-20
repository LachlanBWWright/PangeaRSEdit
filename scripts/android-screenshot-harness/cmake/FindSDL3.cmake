if(TARGET SDL3::SDL3)
    # Reuse the game's SDL target instead of including its build-tree export twice.
    set(SDL3_FOUND TRUE)
else()
    find_package(SDL3 CONFIG REQUIRED)
endif()
