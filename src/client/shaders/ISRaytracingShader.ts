
export const ISRaytracingVertexShader: string = `
    out mat4 i_projectionMatrix;

    void main()
    {   
        i_projectionMatrix = projectionMatrix;
        gl_Position = vec4(position,1.0);
    }
`

export const ISRaytracingFragmentShader: string = `
    uniform vec2 resolution;
    uniform vec3 forward;
    uniform vec3 up;
    uniform vec3 right;
    uniform vec3 pos;
    in mat4 i_projectionMatrix;

    const float PI = 3.14159265359f;

    struct Ray {
        vec3 origin;
        vec3 dir;
    };

    struct Camera {
        vec3 origin;
        vec3 dir;
        vec3 up;
        vec3 right;
        float fov;
    };

    vec3 rayAt(Ray r, float t) {
        return r.origin + t * r.dir;
    }

    bool hit_sphere(vec3 center, float radius, Ray r, out float t) {
        vec3 oc = r.origin - center;
        float a = dot(r.dir, r.dir);
        float b = 2.0f * dot(oc, r.dir);
        float c = dot(oc, oc) - radius*radius;
        float discriminant = b*b - 4.0f * a * c;
        if (discriminant < 0.0f) {
            t = -1.0f;
            return false;
        } else {
            t = (-b - sqrt(discriminant) ) / (2.0f*a);
            return true;
        }
    }

    void main()
    {
        Camera camera = Camera(
            cameraPosition, //position
            forward, //forward / dir
            up, //up
            right, //right
            2.0f * atan( 1.0f / i_projectionMatrix[1].y ) * 180.0f / PI // fov
            );
        
        float aspectRatio = resolution.x / resolution.y;

        vec3 hor = -tan(camera.fov * 2.0f) * camera.right;
        vec3 ver = length(hor) / aspectRatio * camera.up;

        vec2 uv = (gl_FragCoord.xy / resolution - vec2(0.5,0.5)) * 2.0f;

        Ray ray = Ray(
            camera.origin,
            normalize(camera.dir + uv.x * hor + uv.y * ver)
            );
        
        float t;
        if (hit_sphere(vec3(-1, 0, 0), 0.5f, ray, t)) {
            vec3 N = normalize(rayAt(ray, t) - vec3(0,0,2.0));
            gl_FragColor =  vec4(0.5f * vec3(N.x + 1.0f, N.y + 1.0f, N.z + 1.0f), 1.0f);
            vec4 depth_vec = viewMatrix * i_projectionMatrix * vec4(rayAt(ray, t), 1.0);
            float depth = ((depth_vec.z / depth_vec.w) + 1.0) * 0.5; 
            gl_FragDepth = depth;
        }
        else
            discard;

        // if(uv.x * uv.x + uv.y * uv.y < 0.5f * 0.5f)
        // {
        //     gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        // }
        // else
        //     discard;
    } 
`