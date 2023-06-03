import * as THREE from "three";

const infEdge = 1000

function x(t: number, a: number, b: number, c: number): number {
    return Math.sqrt(t * (t + a + b)/(a * b * c))
}

function y(t: number, a: number, b: number, c: number): number {
    return Math.sqrt((t + a) * (c - t) / (a * b * c))
}

function calcXRange(a: number, b: number, c: number): Array<number[]> {
    const abcMult = a * b * c;
    const ab = a + b;
    let result: Array<number[]> = [];
    if(abcMult != 0) {

        if(abcMult < 0) {
            if(ab > 0) {
                
                result[0] = [-ab, 0]
                result[1] = [0, -ab]
            }
        }
        else {
            if(ab > 0) {

                result[0] = [-infEdge, -ab]
                result[1] = [0, infEdge]
            }
            else {
                
                result[0] = [-infEdge, 0]
                result[1] = [-ab, infEdge]
            }
        }   
    }             
    return result
}

function calcYRange(a: number, b: number, c: number): Array<number[]> {
    const abcMult = a * b * c;
    let result: Array<number[]> = [];
    if(abcMult != 0) {
        if(abcMult < 0) {
            result[0] = [-infEdge, Math.min(...[-a,c])]
            result[1] = [Math.max(...[-a,c]), infEdge]
        }
        else {
            result[0] = [Math.min(...[-a,c]), Math.max(...[-a,c])]
        }   
    }             
    return result
}

function xyIntersect(xranges: Array<number[]>, yranges: Array<number[]>): Array<number[]> {
    let result: Array<number[]> = [];
    xranges.forEach(xrange => {
        yranges.forEach(yrange => {
            if(xrange[0] > yrange[0] && xrange[0] < yrange[1])
                result.push([xrange[0], Math.min(xrange[1], yrange[1])]);

            if(yrange[0] > xrange[0] && yrange[0] < xrange[1])
                result.push([yrange[0], Math.min(yrange[1], xrange[1])]);

        });
    });
    return result
};

function dist(x: number, y: number): number {
    return Math.abs(x - y)
}

function distv(x: THREE.Vector3, y: THREE.Vector3): number {
    return x.distanceTo(y)
}

function first(q: any[]): any { return q[0]};
function last(q: any[]): any { return q[q.length - 1]};

function concatOneCircle(quarters: Array<THREE.Vector3[]>): THREE.Vector3[] {
    let concatArray = [quarters[0], [], quarters[2], []];

    if(distv(first(quarters[0]), first(quarters[1])) < distv(first(quarters[0]), first(quarters[3])))
    {
        concatArray[3] = quarters[1].reverse();
        concatArray[1] = quarters[3].reverse();
    }
    else
    {
        concatArray[3] = quarters[3].reverse();
        concatArray[1] = quarters[1].reverse();
    }

    return concatArray[0].concat(concatArray[1]).concat(concatArray[2]).concat(concatArray[3])
};

export type SingCurves = {
    xy: THREE.Vector3[],
    xz: THREE.Vector3[],
    yz: THREE.Vector3[]
}

export function dpCurve(a: number, b: number, c: number, n: number) 
{
    let c1: THREE.Vector3[] = [];
    let c2: THREE.Vector3[] = [];
    let c3: THREE.Vector3[] = [];

    let c1Ranges = xyIntersect(calcXRange(a, b, c), calcYRange(a, b, c));
    let c2Ranges = xyIntersect(calcXRange(c, a, b), calcYRange(c, a, b));
    let c3Ranges = xyIntersect(calcXRange(b, c, a), calcYRange(b, c, a));
    // console.log("c1Ranges:" + c1Ranges)
    // console.log("c2Ranges:" + c2Ranges)
    // console.log("c3Ranges:" + c3Ranges)

    c1Ranges.forEach(c1Range => {
        let c1q1: THREE.Vector3[] = [];
        let c1q2: THREE.Vector3[] = [];
        let c1q3: THREE.Vector3[] = [];
        let c1q4: THREE.Vector3[] = [];

        for(let i = 0; i < n; i++)
        {
            let t =i/(n-1) * dist(c1Range[0], c1Range[1]) + c1Range[0];

            if(a != 0 && b != 0 && c != 0) 
            {
                const c1x = x(t, a, b, c);
                const c1y = y(t, a, b, c);

                c1q1.push(new THREE.Vector3(c1x, c1y, 0));
                c1q2.push(new THREE.Vector3(-c1x, c1y, 0));
                c1q3.push(new THREE.Vector3(-c1x, -c1y, 0));
                c1q4.push(new THREE.Vector3(c1x, -c1y, 0));
            }
        }
        c1 = concatOneCircle([c1q1, c1q2, c1q3, c1q4]);
    })

    c2Ranges.forEach(c2Range => {
        let c2q1: THREE.Vector3[] = [];
        let c2q2: THREE.Vector3[] = [];
        let c2q3: THREE.Vector3[] = [];
        let c2q4: THREE.Vector3[] = [];

        for(let i = 0; i < n; i++)
        {
            let t =i/(n-1) * dist(c2Range[0], c2Range[1]) + c2Range[0];

            if(a != 0 && b != 0 && c != 0) 
            {
                const c2x = x(t, c, a, b);
                const c2y = y(t, c, a, b);

                c2q1.push(new THREE.Vector3(c2y, 0, c2x));
                c2q2.push(new THREE.Vector3(c2y, 0, -c2x));
                c2q3.push(new THREE.Vector3(-c2y, 0, -c2x));
                c2q4.push(new THREE.Vector3(-c2y, 0, c2x));
            }
        }

        c2 = concatOneCircle([c2q1, c2q2, c2q3, c2q4]);
    })

    c3Ranges.forEach(c3Range => {
        let c3q1: THREE.Vector3[] = [];
        let c3q2: THREE.Vector3[] = [];
        let c3q3: THREE.Vector3[] = [];
        let c3q4: THREE.Vector3[] = [];

        for(let i = 0; i < n; i++)
        {
            let t = i/(n-1) * dist(c3Range[0], c3Range[1]) + c3Range[0];

            if(a != 0 && b != 0 && c != 0) 
            {
                const c3x = x(t, c, a, b);
                const c3y = y(t, c, a, b);
                c3q1.push(new THREE.Vector3(0, c3x, c3y));
                c3q2.push(new THREE.Vector3(0, -c3x, c3y));
                c3q3.push(new THREE.Vector3(0, -c3x, -c3y));
                c3q4.push(new THREE.Vector3(0, c3x, -c3y));
            }
        }

        c3 = concatOneCircle([c3q1, c3q2, c3q3, c3q4]);
    })

    return {
        xy: c1,
        xz: c2,
        yz: c3
    }
}