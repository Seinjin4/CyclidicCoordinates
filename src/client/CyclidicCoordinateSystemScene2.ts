import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ImplicitSurfaceMesh } from "./is/ISMesh";
import { TubeMesh } from "./line/lineMesh";
import { coeffs, gradient } from "./shaders/ISRaytracingShader";
import { CalculateGradient, GetEqData, testf } from "./math";
import { GLSLType, Uniform } from "./shaders/ShaderGenerator";
import { DragControls, DragObject } from "./input/DragControls";
import { calculateEllipsePoint, calculateEllipsePoints, calculateHyperbolePoint, calculateHyperbolePoints, maxT, minT } from "./CoordinateSystemFunctions";
import { dpCurve } from "./SingularityCurves";
import * as dat from "dat.gui";

const scene = new THREE.Scene()
scene.background = new THREE.Color().setRGB(0.7,0.7,0.7)
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)
camera.position.z = -7
camera.position.y = 5
camera.position.x = -2

const dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
const ambLight = new THREE.AmbientLight( 0xffffff, 0.6);
scene.add(dirLight)
scene.add(ambLight)

let a = 3;
let b = 1.9;
let c = Math.sqrt(a*a - b*b) 

let t = 1/3;
let phi = Math.PI / 180 * 45

// const axesHelper = new THREE.AxesHelper( 1 )
// scene.add( axesHelper )

let orbitControls: OrbitControls;
let dragControls: DragControls

const aControl = new DragObject(new THREE.Plane(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(a, 0, 0))
const bControl = new DragObject(new THREE.Plane(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, 0, b))

aControl.positionValidation = (position: THREE.Vector3) : THREE.Vector3 => {
    const bControlsZ = bControl.sceneObject.position.z
    const newX = position.x > bControlsZ ? Math.min(10, position.x) : bControlsZ
    const newZ = 0
    const newPos = new THREE.Vector3(newX, 0, newZ)
    return newPos
}

bControl.positionValidation = (position: THREE.Vector3) : THREE.Vector3 => {
    const newX = 0
    const newZ = position.z > 1 ? Math.min(aControl.sceneObject.position.x, position.z) : 1
    const newPos = new THREE.Vector3(newX, 0, newZ)
    return newPos
}

const tControl = new DragObject(new THREE.Plane(new THREE.Vector3(0, 0, 1)), calculateHyperbolePoint(a, b, c, t))

tControl.positionValidation = (position: THREE.Vector3) : THREE.Vector3 => {
    const d = 1 - position.y*position.y/(b*b)
    if(d <= 0)
        return calculateHyperbolePoint(a, b, c, t)

    const newT = - (-b + b * Math.sqrt(d)) / position.y
    t = newT > 0.01 ? Math.min(newT, maxT): 0.01
    return calculateHyperbolePoint(a, b, c, t)
}

const phiControl = new DragObject(new THREE.Plane(new THREE.Vector3(0, 1, 0)), calculateEllipsePoint(a, b, c, phi))

phiControl.positionValidation = (position: THREE.Vector3) : THREE.Vector3 => {

    const newPhi = Math.atan2(position.z, position.x) 
    phi = newPhi  < 0 ? phi : Math.min(Math.PI, newPhi)
    return calculateEllipsePoint(a, b, c, phi)
}

scene.add(aControl.sceneObject)
scene.add(bControl.sceneObject)
scene.add(tControl.sceneObject)
scene.add(phiControl.sceneObject)

// const eConeEq = '4*Ub^2*Ut^2*Ua^2+(4*Ua^2*Ut^3*Ub-4*Ub*Ut*Ua^2)*y-4*Ut^2*Ua^2*z^2-4*Ub^2*Ut^2*x^2+(4*Ub*Ut^3*Usqrt+4*Ub*Ut*Usqrt)*x*y+(-4*Ua^2*Ut^2+2*Ub^2*Ut^2+Ub^2*Ut^4+Ub^2)2Ua*y^2'
// const hConeEq = '-Ua^2*Ub^2*Usinphi^2+Ub^4*Usinphi^2+(2*Ua^2*Ub*Usinphi-2*Ub^3*Usinphi)*z+(-Usinphi^2*Ua^2+Ub^2*Usinphi^2)*y^2+Ub^2*Usinphi^2*x^2+(-Ua^2+Ua^2*Ucosphi^2+Ub^2)*z^2-2*Ub*Usinphi*Ua*Ucosphi*x*z'
// const CyclideEq = '(x^2 + y^2 + z^2 + Ub^2 - Ur^2)^2 - 4*((Ua*x - Uc*Ur)^2 + Ub^2*y^2)'

let eCone: ImplicitSurfaceMesh;
let hCone: ImplicitSurfaceMesh;
let Cyclide: ImplicitSurfaceMesh;

let sphereMesh: ImplicitSurfaceMesh;

const colorFunction = `
vec4 calculateColor(vec3 p, vec3 d, vec3 n)
{
    vec3 lightColor = vec3(0.6, 0.6, 0.6);
    //objectColor = outsideColor;
    float ambientStrength = 0.5;
    vec3 ambient = ambientStrength * lightColor;
    vec3 lightDir = normalize(-vec3(0.5, 0.7, 0.5));  
    float diff = dot(n, lightDir);
    if(diff < 0.0) diff = -diff;
    float dirdiff = dot(n, d);
    if(dirdiff < 0.0)
    {
        objectColor = insideColor;
    }
    else
        objectColor = outsideColor;
    
    vec3 LightReflect = normalize(reflect(lightDir, n));
    float SpecularFactor = dot(-d, LightReflect);

    if(SpecularFactor < 0.0) SpecularFactor = -SpecularFactor;
    
    SpecularFactor = pow(SpecularFactor, 32.0);
    vec4 SpecularColor = vec4(lightColor * 0.9 * SpecularFactor, 1.0f);
    

    vec3 diffuse = diff * lightColor;
    vec3 result = (ambient + diffuse + SpecularColor.xyz) * objectColor;
    return vec4(result, 1.0);
}
`
//Sphere
{
    const sphereCoeff: coeffs = {
        t4 : "0.0 ",
        t3 : "0.0 ",
        t2 : "dot(d,d)",
        t1 : "2.0*dot(d,o)",
        t0 : "dot(o,o) - Ur*Ur",
    }

    const sphereGrad: gradient = {
        x: '2.0*x' ,
        y: '2.0*y' ,
        z: '2.0*z' 
    }

    const uniforms: Uniform[] = [
        {type: GLSLType.vec3, name: 'outsideColor', defaultValue: {value: new THREE.Vector3(0.3, 1.0, 0.3)}},
        {type: GLSLType.vec3, name: 'insideColor', defaultValue: {value: new THREE.Vector3(0.3, 0.8, 0.3)}},
        {type: GLSLType.float, name: 'Ur', defaultValue: {value: 1.0}},
    ]

    const isInBounds: string = `
    bool isInBounds(vec3 p)
    {
        return true;
    }
    `

    sphereMesh = new ImplicitSurfaceMesh(sphereCoeff, sphereGrad, uniforms, isInBounds, colorFunction)
}

//eCone
{
    const eConeCoeff: coeffs = {
        t4 : "0.0 ",
        t3 : "0.0 ",
        t2 : "4.0*Usqrt*Ut*Ut*Ut*Ub*d.x*d.y + 4.0*Usqrt*Ut*Ub*d.x*d.y + Ut*Ut*Ut*Ut*Ub*Ub*d.y*d.y - 4.0*Ut*Ut*Ua*Ua*d.z*d.z - 4.0*Ut*Ut*Ua*Ua*d.y*d.y - 4.0*Ut*Ut*Ub*Ub*d.x*d.x + 2.0*Ut*Ut*Ub*Ub*d.y*d.y + Ub*Ub*d.y*d.y",
        t1 : "4.0*Usqrt*Ut*Ut*Ut*Ub*d.x*o.y + 4.0*Usqrt*Ut*Ut*Ut*Ub*d.y*o.x + 4.0*Usqrt*Ut*Ub*d.x*o.y + 4.0*Usqrt*Ut*Ub*d.y*o.x + 2.0*Ut*Ut*Ut*Ut*Ub*Ub*d.y*o.y + 4.0*Ut*Ut*Ut*Ua*Ua*Ub*d.y - 8.0*Ut*Ut*Ua*Ua*d.z*o.z - 8.0*Ut*Ut*Ua*Ua*d.y*o.y - 8.0*Ut*Ut*Ub*Ub*d.x*o.x + 4.0*Ut*Ut*Ub*Ub*d.y*o.y - 4.0*Ut*Ua*Ua*Ub*d.y + 2.0*Ub*Ub*d.y*o.y",
        t0 : "4.0*Usqrt*Ut*Ut*Ut*Ub*o.x*o.y + 4.0*Usqrt*Ut*Ub*o.x*o.y + Ut*Ut*Ut*Ut*Ub*Ub*o.y*o.y + 4.0*Ut*Ut*Ut*Ua*Ua*Ub*o.y + 4.0*Ut*Ut*Ua*Ua*Ub*Ub - 4.0*Ut*Ut*Ua*Ua*o.z*o.z - 4.0*Ut*Ut*Ua*Ua*o.y*o.y - 4.0*Ut*Ut*Ub*Ub*o.x*o.x + 2.0*Ut*Ut*Ub*Ub*o.y*o.y - 4.0*Ut*Ua*Ua*Ub*o.y + Ub*Ub*o.y*o.y",
    }

    const eConeGrad: gradient = {
        x: '-8.0*Ub*Ub*Ut*Ut*x + y*(4.0*Ub*Usqrt*Ut*Ut*Ut + 4.0*Ub*Usqrt*Ut)' ,
        y: '4.0*Ua*Ua*Ub*Ut*Ut*Ut - 4.0*Ua*Ua*Ub*Ut + x*(4.0*Ub*Usqrt*Ut*Ut*Ut + 4.0*Ub*Usqrt*Ut) + 2.0*y*(-4.0*Ua*Ua*Ut*Ut + Ub*Ub*Ut*Ut*Ut*Ut + 2.0*Ub*Ub*Ut*Ut + Ub*Ub)' ,
        z: '-8.0*Ua*Ua*Ut*Ut*z' 
    }

    const uniforms: Uniform[] = [
        {type: GLSLType.vec3, name: 'outsideColor', defaultValue: {value: new THREE.Vector3(0.3, 1.0, 0.3)}},
        {type: GLSLType.vec3, name: 'insideColor', defaultValue: {value: new THREE.Vector3(0.3, 0.8, 0.3)}},
        {type: GLSLType.float, name: 'Ut', defaultValue: {value: t}},
        {type: GLSLType.float, name: 'UconeTop', defaultValue: {value: calculateHyperbolePoint(a, b, c, t).y}},
        {type: GLSLType.float, name: 'Ua', defaultValue: {value: a}},
        {type: GLSLType.float, name: 'Ub', defaultValue: {value: b}},
        {type: GLSLType.float, name: 'Uc', defaultValue: {value: c}},
        {type: GLSLType.float, name: 'Usqrt', defaultValue: {value: Math.sqrt((a-b)*(a+b))}},
    ]

    const isInBounds: string = `
    bool isInBounds(vec3 p)
    {
        return p.z > 0.0 && p.y > 0.0 && p.y < UconeTop;
    }
    `

    eCone = new ImplicitSurfaceMesh(eConeCoeff, eConeGrad, uniforms, isInBounds, colorFunction)
    // const eConeMesh2 = new ImplicitSurfaceMesh(eConeCoeff, eConeGrad, uniforms, isInBounds, colorFunction)
    // eConeMesh2.setUniform('Ut', 1/3)
    // eConeMesh2.setUniform('UconeTop', calculateHyperbolePoint(a, b, c, 1/3).y)
    // const eConeMesh3 = new ImplicitSurfaceMesh(eConeCoeff, eConeGrad, uniforms, isInBounds, colorFunction)
    // eConeMesh3.setUniform('Ut', 1/7)
    // eConeMesh3.setUniform('UconeTop', calculateHyperbolePoint(a, b, c, 1/7).y)
    // scene.add(eConeMesh2.CreateMesh())
    // scene.add(eConeMesh3.CreateMesh())
}

function UpdateECone(a:number, b:number, c:number) {
    eCone.setUniform('Ua', a)
    eCone.setUniform('Ub', b)
    eCone.setUniform('Uc', c)
    eCone.setUniform('Usqrt', Math.sqrt((a-b)*(a+b)))
    eCone.setUniform('Ut', t)
    eCone.setUniform('UconeTop', calculateHyperbolePoint(a, b, c, t).y)
}

//hCone
{
    const hConeCoeff: coeffs = {
        t4 : "0.0 ",
        t3 : "0.0 ",
        t2 : "Ua*Ua*Ucosphi*Ucosphi*d.z*d.z - Ua*Ua*Usinphi*Usinphi*d.y*d.y - Ua*Ua*d.z*d.z - 2.0*Ua*Ub*Ucosphi*Usinphi*d.x*d.z + Ub*Ub*Usinphi*Usinphi*d.x*d.x + Ub*Ub*Usinphi*Usinphi*d.y*d.y + Ub*Ub*d.z*d.z",
        t1 : "2.0*Ua*Ua*Ub*Usinphi*d.z + 2.0*Ua*Ua*Ucosphi*Ucosphi*d.z*o.z - 2.0*Ua*Ua*Usinphi*Usinphi*d.y*o.y - 2.0*Ua*Ua*d.z*o.z - 2.0*Ua*Ub*Ucosphi*Usinphi*d.x*o.z - 2.0*Ua*Ub*Ucosphi*Usinphi*d.z*o.x - 2.0*Ub*Ub*Ub*Usinphi*d.z + 2.0*Ub*Ub*Usinphi*Usinphi*d.x*o.x + 2.0*Ub*Ub*Usinphi*Usinphi*d.y*o.y + 2.0*Ub*Ub*d.z*o.z",
        t0 : "-Ua*Ua*Ub*Ub*Usinphi*Usinphi + 2.0*Ua*Ua*Ub*Usinphi*o.z + Ua*Ua*Ucosphi*Ucosphi*o.z*o.z - Ua*Ua*Usinphi*Usinphi*o.y*o.y - Ua*Ua*o.z*o.z - 2.0*Ua*Ub*Ucosphi*Usinphi*o.x*o.z + Ub*Ub*Ub*Ub*Usinphi*Usinphi - 2.0*Ub*Ub*Ub*Usinphi*o.z + Ub*Ub*Usinphi*Usinphi*o.x*o.x + Ub*Ub*Usinphi*Usinphi*o.y*o.y + Ub*Ub*o.z*o.z",
    } 

    const hConeGrad: gradient = {
        x: '2.0 * Ub * Ub * Usinphi * Usinphi * x - 2.0 * z * Ub * Usinphi * Ua * Ucosphi' ,
        y: '2.0 * Usinphi * Usinphi * (Ub * Ub - Ua * Ua) * y' ,
        z: '2.0 * (Ua * Ua * Ub * Usinphi + (Ua * Ua * (Ucosphi * Ucosphi - 1.0) + Ub * Ub) * z) - 2.0 * Usinphi * (Ub * Ua * Ucosphi * x + Ub * Ub * Ub)' 
    }

    const pointOnEllipse = calculateEllipsePoint(a, b, c, phi)
    const hyperboleHighPoint = calculateHyperbolePoint(a, b, c, maxT)
    const hyperboleLowPoint = calculateHyperbolePoint(a, b, c, minT)

    const plane1Normal = new THREE.Vector3(0, 1, 0).cross(pointOnEllipse).normalize()
    
    const plane2 = new THREE.Plane().setFromCoplanarPoints(pointOnEllipse, hyperboleHighPoint, hyperboleLowPoint)

    const uniforms: Uniform[] = [
        {type: GLSLType.vec3, name: 'outsideColor', defaultValue: {value: new THREE.Vector3(1.0, 0.3, 0.3)}},
        {type: GLSLType.vec3, name: 'insideColor', defaultValue: {value: new THREE.Vector3(1.0, 0.3, 0.3)}},
        {type: GLSLType.float, name: 'Ua', defaultValue: {value: a}},
        {type: GLSLType.float, name: 'Ub', defaultValue: {value: b}},
        {type: GLSLType.float, name: 'Uc', defaultValue: {value: c}},
        {type: GLSLType.float, name: 'Usinphi', defaultValue: {value: Math.sin(phi)}},
        {type: GLSLType.float, name: 'Ucosphi', defaultValue: {value: Math.cos(phi)}},
        {type: GLSLType.vec3, name: 'Uplane1', defaultValue: {value: plane1Normal}},
        {type: GLSLType.vec4, name: 'Uplane2', defaultValue: {value: new THREE.Vector4(plane2.normal.x, plane2.normal.y, plane2.normal.z, plane2.constant)}},
        // {type: GLSLType.vec4, name: 'Uplane3', defaultValue: {value: new THREE.Vector4(plane3Normal.x, plane3Normal.y, plane3Normal.z, plane3d)}},
    ]

    const isInBounds: string = `
    bool isInBounds(vec3 p)
    {
        if(Ua == Ub)
            return false;
        return p.z > 0.0 && dot(vec4(Uplane1, 0.0), vec4(p, 1.0)) > 0.0 && dot(Uplane2, vec4(p, 1.0)) > 0.0;
    }
    `
    hCone = new ImplicitSurfaceMesh(hConeCoeff, hConeGrad, uniforms, isInBounds, colorFunction)
    // {
    //     let hConeMesh2 = new ImplicitSurfaceMesh(hConeCoeff, hConeGrad, uniforms, isInBounds, colorFunction)
    //     hConeMesh2.setUniform('Usinphi', Math.sin(Math.PI / 180 * 45))
    //     hConeMesh2.setUniform('Ucosphi', Math.cos(Math.PI / 180 * 45))
    //     const pointOnEllipse = calculateEllipsePoint(a, b, c, Math.PI / 180 * 45)
    //     const plane1Normal = new THREE.Vector3(0, 1, 0).cross(pointOnEllipse).normalize()
    //     const plane2 = new THREE.Plane().setFromCoplanarPoints(pointOnEllipse, hyperboleHighPoint, hyperboleLowPoint)
    //     hConeMesh2.setUniform('Uplane1', plane1Normal)
    //     hConeMesh2.setUniform('Uplane2', new THREE.Vector4(plane2.normal.x, plane2.normal.y, plane2.normal.z, plane2.constant))
    //     scene.add(hConeMesh2.CreateMesh())
    // }
    // {
    //     let hConeMesh2 = new ImplicitSurfaceMesh(hConeCoeff, hConeGrad, uniforms, isInBounds, colorFunction)
    //     hConeMesh2.setUniform('Usinphi', Math.sin(Math.PI / 180 * 135))
    //     hConeMesh2.setUniform('Ucosphi', Math.cos(Math.PI / 180 * 135))
    //     const pointOnEllipse = calculateEllipsePoint(a, b, c, Math.PI / 180 * 135)
    //     const plane1Normal = new THREE.Vector3(0, 1, 0).cross(pointOnEllipse).normalize()
    //     const plane2 = new THREE.Plane().setFromCoplanarPoints(pointOnEllipse, hyperboleHighPoint, hyperboleLowPoint)
    //     hConeMesh2.setUniform('Uplane1', plane1Normal)
    //     hConeMesh2.setUniform('Uplane2', new THREE.Vector4(plane2.normal.x, plane2.normal.y, plane2.normal.z, plane2.constant))
    //     scene.add(hConeMesh2.CreateMesh())
    // }
}

function UpdateHCone(a:number, b:number, c:number) {
    const pointOnEllipse = calculateEllipsePoint(a, b, c, phi)
    const hyperboleHighPoint = calculateHyperbolePoint(a, b, c, maxT)
    const hyperboleLowPoint = calculateHyperbolePoint(a, b, c, minT)

    const plane1Normal = new THREE.Vector3(0, 1, 0).cross(pointOnEllipse).normalize()
    
    const plane2 = new THREE.Plane().setFromCoplanarPoints(pointOnEllipse, hyperboleHighPoint, hyperboleLowPoint)

    hCone.setUniform('Ua', a)
    hCone.setUniform('Ub', b)
    hCone.setUniform('Usinphi', Math.sin(phi))
    hCone.setUniform('Ucosphi', Math.cos(phi))
    hCone.setUniform('Uplane1', plane1Normal)
    hCone.setUniform('Uplane2', new THREE.Vector4(plane2.normal.x, plane2.normal.y, plane2.normal.z, plane2.constant))
}

//Cyclide
{
    const CyclideCoeff: coeffs = {
        t4: 'd.x*d.x*d.x*d.x + 2.0*d.x*d.x*d.z*d.z + 2.0*d.x*d.x*d.y*d.y + d.z*d.z*d.z*d.z + 2.0*d.z*d.z*d.y*d.y + d.y*d.y*d.y*d.y',
        t3: '4.0*d.x*d.x*d.x*o.x + 4.0*d.x*d.x*d.z*o.z + 4.0*d.x*d.x*d.y*o.y + 4.0*d.x*d.z*d.z*o.x + 4.0*d.x*d.y*d.y*o.x + 4.0*d.z*d.z*d.z*o.z + 4.0*d.z*d.z*d.y*o.y + 4.0*d.z*d.y*d.y*o.z + 4.0*d.y*d.y*d.y*o.y',
        t2: '-4.0*Ua*Ua*d.x*d.x + 2.0*Ub*Ub*d.x*d.x - 2.0*Ub*Ub*d.z*d.z + 2.0*Ub*Ub*d.y*d.y + 6.0*d.x*d.x*o.x*o.x + 2.0*d.x*d.x*o.z*o.z + 2.0*d.x*d.x*o.y*o.y - 2.0*d.x*d.x*Ur*Ur + 8.0*d.x*d.z*o.x*o.z + 8.0*d.x*d.y*o.x*o.y + 2.0*d.z*d.z*o.x*o.x + 6.0*d.z*d.z*o.z*o.z + 2.0*d.z*d.z*o.y*o.y - 2.0*d.z*d.z*Ur*Ur + 8.0*d.z*d.y*o.z*o.y + 2.0*d.y*d.y*o.x*o.x + 2.0*d.y*d.y*o.z*o.z + 6.0*d.y*d.y*o.y*o.y - 2.0*d.y*d.y*Ur*Ur',
        t1: '-8.0*Ua*Ua*d.x*o.x + 8.0*Ua*Uc*d.x*Ur + 4.0*Ub*Ub*d.x*o.x - 4.0*Ub*Ub*d.z*o.z + 4.0*Ub*Ub*d.y*o.y + 4.0*d.x*o.x*o.x*o.x + 4.0*d.x*o.x*o.z*o.z + 4.0*d.x*o.x*o.y*o.y - 4.0*d.x*o.x*Ur*Ur + 4.0*d.z*o.x*o.x*o.z + 4.0*d.z*o.z*o.z*o.z + 4.0*d.z*o.z*o.y*o.y - 4.0*d.z*o.z*Ur*Ur + 4.0*d.y*o.x*o.x*o.y + 4.0*d.y*o.z*o.z*o.y + 4.0*d.y*o.y*o.y*o.y - 4.0*d.y*o.y*Ur*Ur',
        t0: '-4.0*Ua*Ua*o.x*o.x + 8.0*Ua*Uc*o.x*Ur + Ub*Ub*Ub*Ub + 2.0*Ub*Ub*o.x*o.x - 2.0*Ub*Ub*o.z*o.z + 2.0*Ub*Ub*o.y*o.y - 2.0*Ub*Ub*Ur*Ur - 4.0*Uc*Uc*Ur*Ur + o.x*o.x*o.x*o.x + 2.0*o.x*o.x*o.z*o.z + 2.0*o.x*o.x*o.y*o.y - 2.0*o.x*o.x*Ur*Ur + o.z*o.z*o.z*o.z + 2.0*o.z*o.z*o.y*o.y - 2.0*o.z*o.z*Ur*Ur + o.y*o.y*o.y*o.y - 2.0*o.y*o.y*Ur*Ur + Ur*Ur*Ur*Ur'
    }

    const CyclideGrad: gradient = {
        x: '-8.0*Ua*(Ua*x - Uc*Ur) + 4.0*x*(Ub*Ub - Ur*Ur + x*x + y*y + z*z)' ,
        y: '4.0*y*(Ub*Ub - Ur*Ur + x*x + y*y + z*z)' ,
        z: '-8.0*Ub*Ub*z + 4.0*z*(Ub*Ub - Ur*Ur + x*x + y*y + z*z)' 
    }

    const uniforms: Uniform[] = [
        {type: GLSLType.vec3, name: 'outsideColor', defaultValue: {value: new THREE.Vector3(0.3, 0.3, 1.0)}},
        {type: GLSLType.vec3, name: 'insideColor', defaultValue: {value: new THREE.Vector3(0.3, 0.3, 0.8)}},
        {type: GLSLType.float, name: 'Ur', defaultValue: {value: 1.0}},
        {type: GLSLType.float, name: 'Ua', defaultValue: {value: a}},
        {type: GLSLType.float, name: 'Ub', defaultValue: {value: b}},
        {type: GLSLType.float, name: 'Uc', defaultValue: {value: c}},
    ]

    const isInBounds: string = `
    bool isInBounds(vec3 p)
    {
        return p.z > 0.0;
    }
    `

    Cyclide = new ImplicitSurfaceMesh(CyclideCoeff, CyclideGrad, uniforms, isInBounds, colorFunction)
    // let CyclideMesh2 = new ImplicitSurfaceMesh(CyclideCoeff, CyclideGrad, uniforms, isInBounds, colorFunction)
    // CyclideMesh2.setUniform('Ur', 0.5)
    // scene.add(CyclideMesh2.CreateMesh())
    // let CyclideMesh3 = new ImplicitSurfaceMesh(CyclideCoeff, CyclideGrad, uniforms, isInBounds, colorFunction)
    // CyclideMesh3.setUniform('Ur', 1.5)
    // scene.add(CyclideMesh3.CreateMesh())
}

function OnAbcChange(a:number, b:number, c:number) {
    UpdateECone(a, b, c)
    UpdateHCone(a, b, c)
    Cyclide.setUniform('Ua', a)
    Cyclide.setUniform('Ub', b)
    Cyclide.setUniform('Uc', c)
    htube.SetPoints(calculateHyperbolePoints(a, b, c))
    etube.SetPoints(calculateEllipsePoints(a, b, c))
    const singCurves = dpCurve(a, b, c, 200)
    c1.SetPoints(singCurves.xy)
    c2.SetPoints(singCurves.xz)
    c3.SetPoints(singCurves.yz)
    tControl.sceneObject.position.copy(calculateHyperbolePoint(a, b, c, t))
    phiControl.sceneObject.position.copy(calculateEllipsePoint(a, b, c, phi))
}

const etube = new TubeMesh(12, 1000, true)
etube.setUniform("radius", 0.05)
etube.setUniform("objectColor", new THREE.Vector3(0.7, 0.3, 0.3))
etube.SetPoints(calculateEllipsePoints(a, b, c))

const htube = new TubeMesh(12, 1000, false)
htube.setUniform("radius", 0.05)
htube.setUniform("objectColor", new THREE.Vector3(0.3, 0.7, 0.3))
htube.SetPoints(calculateHyperbolePoints(a, b, c))

const singCurves = dpCurve(0.01, 2, 1, 200)
console.log(singCurves)
const c1 = new TubeMesh(12, 1000, true)
c1.setUniform("radius", 0.03)
c1.setUniform("objectColor", new THREE.Vector3(1, 0.7, 0.7))
c1.SetPoints(singCurves.xy)

const c2 = new TubeMesh(12, 300, true)
c2.setUniform("radius", 0.03)
c2.setUniform("objectColor", new THREE.Vector3(0.7, 1, 0.7))
c2.SetPoints(singCurves.xz)

const c3 = new TubeMesh(12, 300, true)
c3.setUniform("radius", 0.03)
c3.setUniform("objectColor", new THREE.Vector3(0.7, 0.7, 1))
c3.SetPoints(singCurves.yz)

aControl.addEventListener("positionchange", (event) => {
    a = event.object.sceneObject.position.x
    c = Math.sqrt(a*a - b*b) 
    OnAbcChange(a, b, c)
})

bControl.addEventListener("positionchange", (event) => {
    b = event.object.sceneObject.position.z
    c = Math.sqrt(a*a - b*b) 
    OnAbcChange(a, b, c)
})

tControl.addEventListener("positionchange", (event) => {
    UpdateECone(a, b, c)
})

phiControl.addEventListener("positionchange", (event) => {
    UpdateHCone(a, b, c)
})

const eConeMesh = eCone.CreateMesh()
const hConeMesh = hCone.CreateMesh()
const CyclideMesh = Cyclide.CreateMesh()

scene.add(eConeMesh)
scene.add(hConeMesh)
scene.add(CyclideMesh)

scene.add(etube.CreateMesh())
scene.add(htube.CreateMesh())
// scene.add(c1.CreateMesh())
// scene.add(c2.CreateMesh())
// scene.add(c3.CreateMesh())

let params = {
    eConeVisible: true,
    hConeVisible: true,
    CyclideVisible: true,
    Controls: 0,
    ChangetoCoordControls: () => {
        aControl.sceneObject.visible = true;
        bControl.sceneObject.visible = true;
        aControl.enabled = true;
        bControl.enabled = true;
        tControl.sceneObject.visible = false;
        phiControl.sceneObject.visible = false;
        tControl.enabled = false;
        phiControl.enabled = false;
    },
    ChangetoSurfaceControls: () => {
        aControl.sceneObject.visible = false;
        bControl.sceneObject.visible = false;
        aControl.enabled = false;
        bControl.enabled = false;
        tControl.sceneObject.visible = true;
        phiControl.sceneObject.visible = true;
        tControl.enabled = true;
        phiControl.enabled = true;
    },
    ControlChange: (val: number) => {
        if(val == 0)
            params.ChangetoCoordControls()
        if(val == 1)
            params.ChangetoSurfaceControls()
    }
}

params.ChangetoCoordControls();

var gui = new dat.GUI();
var surf = gui.addFolder('Surfaces');
surf.add(params, 'eConeVisible').name('Ellipse Cone Enabled').onChange(val => eConeMesh.visible = val)
surf.add(params, 'hConeVisible').name('Hyperbole Cone Enabled').onChange(val => hConeMesh.visible = val)
surf.add(params, 'CyclideVisible').name('Cyclide Enabled').onChange(val => CyclideMesh.visible = val)

gui.add(params, 'Controls', { Coordinate: 0, Surface: 1} ).onChange(val => params.ControlChange(val));

export function OnWindowResize() {
    eCone.UpdateResolution()
    hCone.UpdateResolution()
    Cyclide.UpdateResolution()
}

export function UpdateScene() {
    orbitControls.update()
    orbitControls.enablePan = false
}

export function CreateScene(renderer: THREE.WebGLRenderer): THREE.Scene
{
    orbitControls = new OrbitControls(camera, renderer.domElement)
    // orbitControls.target = new THREE.Vector3(1, 0, 1)
    dragControls = new DragControls([aControl, bControl, tControl, phiControl], camera, renderer.domElement, orbitControls)
    return scene
}

export function GetCamera(): THREE.PerspectiveCamera 
{
    return camera
}