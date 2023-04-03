
export const lineMeshPointArraySize: number = 1024

export const lineMeshVertexShader: string = `
    uniform vec3 points[${lineMeshPointArraySize}];
    uniform uint pointCount;

    out vec4 vertexColor;

    #define M_PI 3.141592

    vec3 selectPoint(float t) {
        return points[int(round(t * float(pointCount - 1u)))];
    }

    void main()
    {
        float t = uv.x;

        vec3 newPoint = selectPoint(t);

        vec3 newPosition = vec3(newPoint.x, position.y, newPoint.z);

        gl_Position = projectionMatrix *
                        modelViewMatrix *
                        vec4(newPosition,1.0);
        vertexColor = vec4(uv.x, uv.y, 0.0, 1.0);
    }
`

export const lineMeshFragmentShader: string = `
    in vec4 vertexColor;

    void main()
    {
        gl_FragColor = vertexColor;
    } 
`