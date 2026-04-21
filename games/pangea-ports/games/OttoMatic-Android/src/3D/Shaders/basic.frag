// Basic fragment shader for OttoMatic WebGL port
// Replaces fixed-function fragment processing

#ifdef GL_ES
precision mediump float;
#endif

// Texture samplers
uniform sampler2D uTexture0;
uniform sampler2D uTexture1;

// Texture enables
uniform bool uUseTexture0;
uniform bool uUseTexture1;

// Multi-texture modes
uniform int uMultiTextureMode; // 0=none, 1=modulate, 2=add, 3=sphere_map
uniform int uMultiTextureCombine; // 0=modulate, 1=add

// Sphere mapping uniforms
uniform bool uUseSphereMap;
uniform mediump mat3 uNormalMatrix;

// Fog uniforms
uniform bool uFogEnabled;
uniform vec3 uFogColor;

// Alpha test uniforms
uniform bool uAlphaTestEnabled;
uniform int uAlphaFunc; // 0=NEVER, 1=LESS, 2=EQUAL, 3=LEQUAL, 4=GREATER, 5=NOTEQUAL, 6=GEQUAL, 7=ALWAYS
uniform float uAlphaRef;

// Global transparency and color filter
uniform float uGlobalTransparency;
uniform vec3 uGlobalColorFilter;

// Varyings from vertex shader
varying vec4 vColor;
varying vec2 vTexCoord0;
varying vec2 vTexCoord1;
varying float vFogFactor;
varying vec3 vNormal;

void main()
{
    vec4 color = vColor;

    // Sample textures
    if (uUseTexture0)
    {
        vec4 texColor = texture2D(uTexture0, vTexCoord0);
        color *= texColor;
    }

    // Multi-texturing
    if (uUseTexture1)
    {
        vec2 texCoord1 = vTexCoord1;

        // Calculate sphere map coordinates if enabled
        if (uUseSphereMap)
        {
            // Sphere mapping: use normal to calculate reflection texture coordinates
            vec3 normal = normalize(vNormal);
            // Transform normal to view space
            vec3 viewNormal = normalize(uNormalMatrix * normal);
            // Calculate sphere map coordinates
            // This is a simplified version - full implementation would use reflected view vector
            texCoord1 = viewNormal.xy * 0.5 + 0.5;
        }

        vec4 texColor1 = texture2D(uTexture1, texCoord1);

        // Apply multi-texture combine mode
        if (uMultiTextureCombine == 0) // MODULATE
        {
            color *= texColor1;
        }
        else if (uMultiTextureCombine == 1) // ADD
        {
            color.rgb += texColor1.rgb;
        }
    }

    // Apply global color filter
    color.rgb *= uGlobalColorFilter;

    // Apply global transparency
    color.a *= uGlobalTransparency;

    // Alpha test
    if (uAlphaTestEnabled)
    {
        bool discard_frag = false;

        if (uAlphaFunc == 0) // NEVER
            discard_frag = true;
        else if (uAlphaFunc == 1) // LESS
            discard_frag = color.a >= uAlphaRef;
        else if (uAlphaFunc == 2) // EQUAL
            discard_frag = abs(color.a - uAlphaRef) > 0.001;
        else if (uAlphaFunc == 3) // LEQUAL
            discard_frag = color.a > uAlphaRef;
        else if (uAlphaFunc == 4) // GREATER
            discard_frag = color.a <= uAlphaRef;
        else if (uAlphaFunc == 5) // NOTEQUAL
            discard_frag = abs(color.a - uAlphaRef) < 0.001;
        else if (uAlphaFunc == 6) // GEQUAL
            discard_frag = color.a < uAlphaRef;
        // uAlphaFunc == 7 (ALWAYS) never discards

        if (discard_frag)
            discard;
    }

    // Apply fog
    if (uFogEnabled)
    {
        color.rgb = mix(uFogColor, color.rgb, vFogFactor);
    }

    gl_FragColor = color;
}
