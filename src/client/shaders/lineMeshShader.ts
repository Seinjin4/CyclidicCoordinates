
export const lineMeshPointArraySize: number = 1024

export const lineMeshVertexShader: string = `
    uniform vec3 points[${lineMeshPointArraySize}];
    uniform uint pointCount;
    uniform float radius;

    out vec4 vertexColor;

    #define M_PI 3.141592

    float getFract(float t)
    {
        return fract(t * float(pointCount - 1u));
    }

    uint getPointIndexFloor(float t)
    {
        return uint(floor(t * float(pointCount - 1u)));
    }

    uint getPointIndexCeil(float t)
    {
        return uint(ceil(t * float(pointCount - 1u)));
    }

    vec3 getDir(uint i)
    {
        vec3 corePoint = points[i];
        if(i == 0u)
            return normalize(points[i + 1u] - corePoint);
        else if(i == pointCount - 1u)
            return normalize(-(points[i - 1u] - corePoint));

        return normalize((points[i + 1u] - corePoint) - (points[i - 1u] - corePoint));
    }

    mat4 rotationMatrix(vec3 axis, float angle)
    {
        axis = normalize(axis);
        float s = sin(angle);
        float c = cos(angle);
        float oc = 1.0 - c;
        
        return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                    0.0,                                0.0,                                0.0,                                1.0);
    }

    void main()
    {
        float t = uv.x;
        float a = uv.y;
        uint p0i = getPointIndexFloor(t);
        uint p1i = getPointIndexCeil(t);

        vec3 pos0 = points[p0i];
        vec3 pos1 = points[p1i];
        float f = getFract(t);

        vec3 pos = mix(pos0, pos1, f); // try B-spline
        vec3 dir = mix(getDir(p0i), getDir(p1i), f); // try B-spline dir
        vec3 tangent = cross(vec3(0.0, 1.0, 0.0), dir); // try B-spline tangent
        
        vec3 newPos = (rotationMatrix(dir, M_PI*2.0*a) * vec4(tangent, 1.0f)).xyz * radius + pos;

        gl_Position = projectionMatrix *
                        modelViewMatrix *
                        vec4(newPos,1.0);
        vertexColor = vec4(1.0, 0, 0.0, 1.0);
    }
`

export const lineMeshFragmentShader: string = `
    in vec4 vertexColor;

    void main()
    {
        gl_FragColor = vertexColor;
    } 
`