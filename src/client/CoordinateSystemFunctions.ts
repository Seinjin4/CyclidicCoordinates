import * as THREE from "three"

const n = 100
export const maxT = 0.4
export const minT = -0.4


export function calculateHyperbolePoint(a: number, b: number, c: number, t:number) : THREE.Vector3{
    return new THREE.Vector3(c * (1 + t * t) / (1 - t * t), 2 * b * t / (1 - t * t), 0);
}

export function calculateEllipsePoint(a: number, b: number, c: number, t:number) : THREE.Vector3{
    return new THREE.Vector3(a * Math.cos(t), 0, b * Math.sin(t));
}

export function calculateHyperbolePoints(a: number, b: number, c: number): THREE.Vector3[] {
    let hyperbolePList: THREE.Vector3[] = []
    for(let i = 0; i < n ; i ++) {
        const t = (i / (n-1)) * (maxT - minT) + minT
        hyperbolePList.push(calculateHyperbolePoint(a, b, c, t))
    }
    return hyperbolePList
}

export function calculateEllipsePoints(a: number, b: number, c: number): THREE.Vector3[] {
    let ellipsePList: THREE.Vector3[] = []
    for(let i = 0; i < n ; i ++) {
        const t = i / n * Math.PI * 2
        ellipsePList.push(calculateEllipsePoint(a, b, c, t))
    }
    return ellipsePList
}