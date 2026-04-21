// Basic vertex shader for OttoMatic WebGL port
// Replaces fixed-function vertex processing

precision highp float;

attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec4 aColor;
attribute vec2 aTexCoord0;
attribute vec2 aTexCoord1;

uniform mat4 uMVPMatrix;        // Combined Model-View-Projection matrix
uniform mat4 uModelViewMatrix;  // Model-View matrix for lighting calculations
uniform mediump mat3 uNormalMatrix;     // Normal transformation matrix

// Lighting uniforms (up to 4 lights)
uniform vec3 uAmbientLight;
uniform vec3 uLightDirection[4];
uniform vec3 uLightColor[4];
uniform int uNumLights;

// Fog uniforms
uniform bool uFogEnabled;
uniform float uFogStart;
uniform float uFogEnd;
uniform float uFogDensity;
uniform int uFogMode; // 0=LINEAR, 1=EXP, 2=EXP2

// Material uniforms
uniform vec4 uMaterialColor;
uniform bool uUseLighting;
uniform bool uUseVertexColor;

// Texture uniforms
uniform bool uUseTexture0;
uniform bool uUseTexture1;
uniform mat4 uTextureMatrix;

// Varyings to fragment shader
varying vec4 vColor;
varying vec2 vTexCoord0;
varying vec2 vTexCoord1;
varying float vFogFactor;
varying vec3 vNormal;

void main()
{
    // Transform position
    gl_Position = uMVPMatrix * vec4(aPosition, 1.0);

    // Calculate view space position for fog
    vec4 viewPos = uModelViewMatrix * vec4(aPosition, 1.0);
    float fogCoord = length(viewPos.xyz);

    // Calculate fog factor
    if (uFogEnabled)
    {
        if (uFogMode == 0) // LINEAR
        {
            float fogRange = uFogEnd - uFogStart;
            if (abs(fogRange) > 0.001)
                vFogFactor = (uFogEnd - fogCoord) / fogRange;
            else
                vFogFactor = 1.0;
        }
        else if (uFogMode == 1) // EXP
        {
            vFogFactor = exp(-uFogDensity * fogCoord);
        }
        else // EXP2
        {
            vFogFactor = exp(-pow(uFogDensity * fogCoord, 2.0));
        }
        vFogFactor = clamp(vFogFactor, 0.0, 1.0);
    }
    else
    {
        vFogFactor = 1.0;
    }

    // Transform normal
    vec3 normal = normalize(uNormalMatrix * aNormal);
    vNormal = normal;

    // Calculate lighting
    vec4 finalColor = uMaterialColor;

    if (uUseLighting)
    {
        vec3 ambient = uAmbientLight;
        vec3 diffuse = vec3(0.0);

        for (int i = 0; i < 4; i++)
        {
            if (i >= uNumLights) break;

            float NdotL = max(dot(normal, uLightDirection[i]), 0.0);
            diffuse += uLightColor[i] * NdotL;
        }

        finalColor.rgb *= (ambient + diffuse);
    }

    // Apply vertex color if enabled
    if (uUseVertexColor)
    {
        finalColor *= aColor;
    }

    vColor = finalColor;

    // Pass texture coordinates
    if (uUseTexture0)
    {
        // Apply texture matrix for UV animation
        vec4 texCoord = uTextureMatrix * vec4(aTexCoord0, 0.0, 1.0);
        vTexCoord0 = texCoord.xy;
    }
    else
    {
        vTexCoord0 = aTexCoord0;
    }

    vTexCoord1 = aTexCoord1;
}
