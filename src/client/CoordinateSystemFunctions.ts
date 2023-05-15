import * as THREE from "three"

const n = 100

export function calculateHyperbolePoints(a: number, b: number, c: number): THREE.Vector3[] {
    let hyperbolePList: THREE.Vector3[] = []
    for(let i = 0; i < n ; i ++) {
        const t = i / n - 0.5
        hyperbolePList.push(new THREE.Vector3(c * (1 + t * t) / (1 - t * t), 2 * b * t / (1 - t * t), 0))
    }
    return hyperbolePList
}

export function calculateEllipsePoints(a: number, b: number, c: number): THREE.Vector3[] {
    let ellipsePList: THREE.Vector3[] = []
    for(let i = 0; i < n ; i ++) {
        ellipsePList.push(new THREE.Vector3(a * Math.cos(i / n * Math.PI * 2), 0, b * Math.sin(i / n * Math.PI * 2)))
    }
    return ellipsePList
}