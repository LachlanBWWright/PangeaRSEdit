#include <math.h>
#include <stdio.h>
#include "TouchLayout.h"

static int inside(TouchControlCircle circle, float left, float top, float right, float bottom)
{
    return circle.x - circle.radius >= left - 0.01f
        && circle.x + circle.radius <= right + 0.01f
        && circle.y - circle.radius >= top - 0.01f
        && circle.y + circle.radius <= bottom + 0.01f;
}

static int separated(TouchControlCircle a, TouchControlCircle b)
{
    float dx = a.x - b.x, dy = a.y - b.y;
    float radii = a.radius + b.radius;
    return dx*dx + dy*dy >= radii*radii - 0.1f;
}

static int check_layout(float width, float height, int count, float inset, unsigned cameraMask)
{
    TouchLayout layout;
    TouchLayout_ComputeGrouped(&layout, width, height, count, cameraMask, inset, inset, inset, inset);
    float right = width - inset, bottom = height - inset;
    if (!inside(layout.stick, 0, inset, right, bottom)) return 1;
    if (layout.stick.x - layout.stick.radius * 0.38f < inset) return 2;
    float edgeGap = layout.stick.x - layout.stick.radius;
    if (edgeGap <= 0 || edgeGap > layout.stick.radius * 0.2f) return 2;
    float rows[2] = {0};
    int rowCount = 0, gameplayCount = 0, bottomCount = 0;
    for (int i = 0; i < count; i++)
    {
        TouchControlCircle action = layout.actions[i];
        if (!inside(action, inset, inset, right, bottom)) return 3;
        if (!separated(action, layout.stick)) return 4;
        if (cameraMask & (1u << i))
        {
            if (action.y > height * 0.4f || action.y <= layout.utility[0].y) return 12;
        }
        else
        {
            gameplayCount++;
            int row = 0;
            while (row < rowCount && rows[row] != action.y) row++;
            if (row == rowCount)
            {
                if (rowCount == 2) return 13;
                rows[rowCount++] = action.y;
            }
            if (row == 0) bottomCount++;
        }
        if (!TouchLayout_Contains(&action, action.x, action.y)) return 5;
        if (TouchLayout_Contains(&action, action.x + action.radius*1.01f, action.y)) return 6;
        for (int j = 0; j < i; j++)
            if (!separated(action, layout.actions[j])) return 7;
    }
    if (gameplayCount > 1 && rowCount != 2) return 14;
    if (bottomCount != (gameplayCount + 1) / 2) return 15;
    for (int i = 0; i < 3; i++)
    {
        TouchControlCircle menu = layout.utility[i];
        if (!inside(menu, inset, inset, right, bottom)) return 8;
        if (menu.x < inset + (width - 2*inset) * 0.6f || menu.y > height*0.2f) return 9;
        if (!TouchLayout_Contains(&menu, menu.x, menu.y)) return 10;
        for (int j = 0; j < count; j++)
            if (!separated(menu, layout.actions[j])) return 16;
        for (int j = 0; j < i; j++)
            if (!separated(menu, layout.utility[j])) return 11;
    }
    return 0;
}

int main(void)
{
    TouchLayout notched;
    TouchLayout_ComputeWithInsets(&notched, 2400, 1080, 8, 206, 63, 0, 84);
    if (notched.stick.x - notched.stick.radius >= 206
        || notched.stick.x - notched.stick.radius * 0.38f < 206) return 1;
    const float sizes[][2] = {{640,360},{2400,1080},{360,640},{1080,2400},{480,360}};
    for (int size = 0; size < 5; size++)
    {
        for (int count = 0; count <= 8; count++)
        {
            for (unsigned mask = 0; mask < (1u << count); mask++)
            {
                int result = check_layout(sizes[size][0], sizes[size][1], count, 0, mask);
                if (!result) result = check_layout(sizes[size][0], sizes[size][1], count, 24, mask);
                if (!result) continue;
                fprintf(stderr, "Layout failure %d at %.0fx%.0f with %d actions mask %u\n",
                    result, sizes[size][0], sizes[size][1], count, mask);
                return 1;
            }
        }
    }
    return 0;
}
