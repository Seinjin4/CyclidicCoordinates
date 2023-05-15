import * as math from "mathjs"
import { coeffs, gradient } from "./shaders/ISRaytracingShader"

enum Nodes{
    functionNode = "FunctionNode",
    operatorNode = "OperatorNode",
    constantNode = "ConstantNode",
    symbolNode = "SymbolNode"
}

enum ops{
    subtract = "-",
    add = "+",
    multiply = "*",
    devide = "/",
    pow = "^"
}

const t: string = "t"

export class StringEqParser {

    static IsConstant(token: string): boolean {
        let isConstant: boolean = false;

        [...token].forEach((v, i, a) => {
            if(i == 0 || i == 1)
            {
                isConstant = v == '(' || !isNaN(Number(v))
            }
            else
            {
                if(isNaN(Number(v)))
                {
                    isConstant = false
                    return
                }
            }
        })
        return isConstant
    }

    static AddFractionToToken(token: string): string {
        return token + ".0"
    }

    public static AddFractionToConstant(eq: string): string {
        eq += ' '
        const tokens = eq.split(" ")
        const conTokens = tokens.filter(x => this.IsConstant(x))

        type TokenMap = {
            oldToken: string,
            newToken: string
        }

        const newTokenMap = conTokens.map((x): TokenMap => {return {oldToken: x, newToken: this.AddFractionToToken(x)}})

        newTokenMap.forEach(x => {
            eq = eq.replace(x.oldToken + ' ', x.newToken + ' ')
        })

        return eq
    }

    public static PrepareVectorConstants(eq: math.MathNode): string {
        let substitutions = new Map<math.MathNode, math.MathNode | string>([
            [math.parse('r^2'), math.parse('rr')],
            [math.parse('r^4'), math.parse('rr * rr')],
            [math.parse('R^2'), math.parse('RR')],
            [math.parse('R^4'), math.parse('RR * RR')],
            [math.parse('d * o'), math.parse('od')],
            [math.parse('o * d'), math.parse('od')],
            [math.parse('d^2'), math.parse('dd')],
            [math.parse('o^2'), math.parse('oo')],
            [math.parse('d^4'), math.parse('dd*dd')],
            [math.parse('o^4'), math.parse('oo*oo')],
            [math.parse('d^3 * o'), math.parse('dddo')],
            [math.parse('o * d^3'), math.parse('dddo')],
            [math.parse('o^3 * d'), math.parse('dooo')],
            [math.parse('d * o^3'), math.parse('dooo')],
            // [math.parse('d^2 * o^2'), math.parse('dd * oo')],
            // [math.parse('o^2 * d^2'), math.parse('dd * oo')],
            [math.parse('dx ^ 4'), 'd.x * d.x * d.x * d.x'],
            [math.parse('dy ^ 4'), 'd.y * d.y * d.y * d.y'],
            [math.parse('dz ^ 4'), 'd.z * d.z * d.z * d.z'],
            [math.parse('ox ^ 4'), 'o.x * o.x * o.x * o.x'],
            [math.parse('oy ^ 4'), 'o.y * o.y * o.y * o.y'],
            [math.parse('oz ^ 4'), 'o.z * o.z * o.z * o.z'],
            [math.parse('dx ^ 3'), 'd.x * d.x * d.x'],
            [math.parse('dy ^ 3'), 'd.y * d.y * d.y'],
            [math.parse('dz ^ 3'), 'd.z * d.z * d.z'],
            [math.parse('ox ^ 3'), 'o.x * o.x * o.x'],
            [math.parse('oy ^ 3'), 'o.y * o.y * o.y'],
            [math.parse('oz ^ 3'), 'o.z * o.z * o.z'],
            [math.parse('dx ^ 2'), 'd.x * d.x'],
            [math.parse('dy ^ 2'), 'd.y * d.y'],
            [math.parse('dz ^ 2'), 'd.z * d.z'],
            [math.parse('ox ^ 2'), 'o.x * o.x'],
            [math.parse('oy ^ 2'), 'o.y * o.y'],
            [math.parse('oz ^ 2'), 'o.z * o.z'],
            [math.parse('dx'), 'd.x'],
            [math.parse('dy'), 'd.y'],
            [math.parse('dz'), 'd.z'],
            [math.parse('ox'), 'o.x'],
            [math.parse('oy'), 'o.y'],
            [math.parse('oz'), 'o.z'],
        ])

        return substitute(eq, substitutions).toString()
    }
}

function IsMultiplication(node: math.OperatorNode): boolean {
    return node.op == ops.multiply
}

function IsSum(node: math.OperatorNode): boolean {
    return node.op == ops.add || node.op == ops.subtract
}

function GetMultiplicationConstant(node: math.MathNode): math.MathNode {
    const newnode = node.transform(function (cnode) {
        if(cnode instanceof math.SymbolNode)
        {
            if(cnode.name == t)
                return new math.ConstantNode(1)

        }
        return cnode
    })

    if(newnode !== undefined)
        return newnode
    else
        return node
}

function GetMultiplicationTPower(node: math.OperatorNode): number {
    const filter = node.filter(function (cnode) {
        return PowerOfVariable(cnode) > 0
    })

    if(filter.length == 0)
        return 0;

    const powers = filter.map(x => PowerOfVariable(x))

    return Math.max(...powers)
}

function PowerOfVariable(node: math.MathNode): number {
    if(node instanceof math.SymbolNode)
        if(node.name == t)
            return 1

    if(!(node instanceof math.OperatorNode))
        return -1

    if(node.op != ops.pow)
        return -1

    if(node.args[0] instanceof math.SymbolNode && node.args[1] instanceof math.ConstantNode)
        if(node.args[0].name == t)
            return node.args[1].value

    if(node.args[1] instanceof math.SymbolNode && node.args[0] instanceof math.ConstantNode)
        if(node.args[1].name == t)
            return node.args[0].value

    return -1
}

function pickWithVariable(node: math.MathNode, tPower: number): math.MathNode {
    if(!(node instanceof math.OperatorNode))
    {
        if(tPower == 0)
            return node
        else
            return math.parse('0');
    }
    
    let newLNode: math.MathNode
    let newRNode: math.MathNode

    if(IsSum(node.args[0]))
    {
        newLNode = pickWithVariable(node.args[0], tPower)
    }
    else
    {
        if(GetMultiplicationTPower(node.args[0]) == tPower)
        {
            newLNode = GetMultiplicationConstant(node.args[0]);
            // newLNode = node.args[0];
        }
        else
        {
            newLNode = math.parse('0');
        }
    }

    if(IsSum(node.args[1]))
    {
        newRNode = pickWithVariable(node.args[1], tPower)
    }
    else
    {
        if(GetMultiplicationTPower(node.args[1]) == tPower)
        {
            newRNode = GetMultiplicationConstant(node.args[1]);
            // newRNode = node.args[1];
        }
        else
        {
            newRNode = math.parse('0');
        }
    }

    return new math.OperatorNode(node.op, node.fn, [newLNode, newRNode])
}

function tryAddParenthesis(node: math.OperatorNode): math.OperatorNode {
    if(node.op != ops.multiply)
        return node
    
    if(node.args[0] instanceof math.SymbolNode)
    {
        if(node.args[0].name == t)
        {
            return new math.OperatorNode(node.op, node.fn, [new math.ParenthesisNode(node.args[1]), node.args[0]])
        }
    }
    else if(node.args[1] instanceof math.SymbolNode)
    {
        if(node.args[1].name == t)
        {
            return new math.OperatorNode(node.op, node.fn, [new math.ParenthesisNode(node.args[0]), node.args[1]])
        }
    }
    
    if(node.args[0] instanceof math.OperatorNode)
    {
        if(node.args[0].op == ops.pow)
        {
            if(node.args[0].args[0] instanceof math.SymbolNode)
                if(node.args[0].args[0] .name == t)
                {
                    return new math.OperatorNode(node.op, node.fn, [new math.ParenthesisNode(node.args[1]), node.args[0]])
                }
            if(node.args[0].args[1] instanceof math.SymbolNode)
                if(node.args[0].args[1] .name == t)
                {
                    return new math.OperatorNode(node.op, node.fn, [new math.ParenthesisNode(node.args[1]), node.args[0]])
                }
        }
    }
    else if(node.args[1] instanceof math.OperatorNode)
    {
        if(node.args[1].op == ops.pow)
        {
            if(node.args[1].args[0] instanceof math.SymbolNode)
                if(node.args[1].args[0] .name == t)
                {
                    return new math.OperatorNode(node.op, node.fn, [new math.ParenthesisNode(node.args[0]), node.args[1]])
                }
            if(node.args[1].args[1] instanceof math.SymbolNode)
                if(node.args[1].args[1] .name == t)
                {
                    return new math.OperatorNode(node.op, node.fn, [new math.ParenthesisNode(node.args[0]), node.args[1]])
                }
        }
    }

    return node
}

function mergeParenthesis(lNode: math.ParenthesisNode, rNode: math.ParenthesisNode, oldOp: math.OperatorNode): math.ParenthesisNode {

    return new math.ParenthesisNode(new math.OperatorNode(oldOp.op, oldOp.fn, [lNode.content, rNode.content]))
}

function tryMergeParenthesis(node: math.OperatorNode): math.OperatorNode {
    if(node.op == ops.multiply || node.op == ops.devide)
        return node

    if(!(node.args[0] instanceof math.OperatorNode) || !(node.args[1] instanceof math.OperatorNode))
        return node

    let l = node.args[0]
    let r = node.args[1]

    let tNode: math.MathNode

    let lt: number
    let lCoeff: math.ParenthesisNode

    let rt: number
    let rCoeff: math.ParenthesisNode

    if(l.args[0] instanceof math.ParenthesisNode && PowerOfVariable(l.args[1]) > 0)
        {
            tNode = l.args[1]
            lt = PowerOfVariable(l.args[1])
            lCoeff = l.args[0]
        }
    else if(l.args[1] instanceof math.ParenthesisNode && PowerOfVariable(l.args[0]) > 0)
        {
            tNode = l.args[0]
            lt = PowerOfVariable(l.args[0])
            lCoeff = l.args[1]
        }
    else
        return node

    if(r.args[0] instanceof math.ParenthesisNode && PowerOfVariable(r.args[1]) > 0)
        {
            rt = PowerOfVariable(r.args[1])
            rCoeff = r.args[0]
        }
    else if(r.args[1] instanceof math.ParenthesisNode && PowerOfVariable(r.args[0]) > 0)
        {
            rt = PowerOfVariable(r.args[0])
            rCoeff = r.args[1]
        }
    else
        return node
    
    if(rt != lt)
        return node
    
    let newNode = new math.ParenthesisNode(new math.OperatorNode(node.op, node.fn, [lCoeff.content, rCoeff.content]))

    return new math.OperatorNode("*" as never, "multiply" as never, [newNode, tNode])
}

function convertToPolynomialFormat(node: math.MathNode): math.MathNode {

    return node;
}

export function CalculateGradient(eq: string): gradient {
    const rules = [
        "n^2 -> n * n",
        "n^3 -> n * n * n",
        "n^4 -> n * n * n * n"
    ]

    return {
        x: StringEqParser.AddFractionToConstant(math.simplify(math.derivative(eq, "x"), rules).toString()),
        y: StringEqParser.AddFractionToConstant(math.simplify(math.derivative(eq, "y"), rules).toString()),
        z: StringEqParser.AddFractionToConstant(math.simplify(math.derivative(eq, "z"), rules).toString()),
    }
}

function FastRationalize(node: math.MathNode, split: number): math.MathNode {
    if(!(node instanceof math.OperatorNode))
        return math.rationalize(node)
    
    if(split > 1)
    {
        return new math.OperatorNode(node.op, node.fn, [
            FastRationalize(node.args[0], split - 1),
            FastRationalize(node.args[1], split - 1)
        ])
    }
    else
    {
        return math.rationalize(node);
    }
}


function substitute(node: math.MathNode, substitutions: Map<math.MathNode, math.MathNode | string>): math.MathNode {
    let nodeString = node.toString()

    substitutions.forEach((v, k) => {
        while(nodeString.includes(k.toString()))
        {   
            if(typeof v === 'string')
                nodeString = nodeString.replace(k.toString(), v)
            else
                nodeString = nodeString.replace(k.toString(), v.toString())
        }
    });
    return math.parse(nodeString)
}

export function testf(): void {
    //const eq = "(x^2+y^2+z^2)^2 - 2*(R^2 + r^2)*(x^2+y^2+z^2) + 4*R^2*y^2 + (R^2 - r^2)^2"
    //const eq = "v^4 - 2*(R^2 + r^2)*(v^2) + 4*R^2*y^2 + (R^2 - r^2)^2"
    //const eq = "v^4 - (v^2)*(R^2 + r^2)"
    //const eq = "v^4"
    //const eq = "x^2+y^2+z^3-z^2"
    //const eq = "x^2 + y^2 + z^2 - r^2"
    //const eq = "(x)*t^2 + z +(y)*t^2 + y*t"
    //const eq = '1/25 * x^2 + 1/25 * y^2 - (z - 1^2) / 1^2'
    const eq = '1/25 * x^2 + 1/25 * y^2 - (z - Ut)^2 * Uot^2'

    let node = math.parse(eq)

    console.log("Original eq: " + eq)

    let firstSubstitutions = new Map<math.MathNode, math.MathNode>([
        [math.parse('x ^ 2 + y ^ 2 + z ^ 2'), math.parse('v ^ 2')]
    ])

    node = substitute(node, firstSubstitutions)

    console.log("After first substitution: " + node.toString())

    node = math.simplify(node, {
        v: math.parse("o + d * t"),
        x: math.parse("ox + dx * t"),
        y: math.parse("oy + dy * t"),
        z: math.parse("oz + dz * t")
    })

    console.log('Simplify: ' + node.toString())

    let secondSubstitutions = new Map<math.MathNode, math.MathNode>([
        [math.parse('(o + d * t) ^ 2'), math.parse('o ^ 2 + o * d * t + d * t * o + t ^ 2 * d ^ 2')],
        // [math.parse('(o + d * t) ^ 2'), math.parse('(ox + dx * t) ^ 2 + (oy + dy * t) ^ 2 + (oz + dz * t) ^ 2')],
        //[math.parse('(o + d * t) ^ 4'), math.parse('o ^ 4 + o ^ 3 * d * t + o ^ 3 * d * t + o ^ 2 * t ^ 2 * d ^ 2 + o ^ 3 * d * t + t ^ 2 * d ^ 2 * o ^ 2 + o ^ 2 * t ^ 2 * d ^ 2 + t ^ 3 * d ^ 3 * o + o ^ 3 * d * t + t ^ 2 * d ^ 2 * o ^ 2 + o ^ 2 * t ^ 2 * d ^ 2 + t ^ 3 * d ^ 3 * o + t ^ 2 * d ^ 2 * o ^ 2 + t ^ 3 * d ^ 3 * o + t ^ 3 * d ^ 3 * o + t ^ 4 * d ^ 4')],
        [math.parse('(ox + dx * t) ^ 2'), math.parse('ox ^ 2 + ox * dx * t + dx * t * ox + t ^ 2 * dx ^ 2')],
        [math.parse('(oy + dy * t) ^ 2'), math.parse('oy ^ 2 + oy * dy * t + dy * t * oy + t ^ 2 * dy ^ 2')],
        [math.parse('(oz + dz * t) ^ 2'), math.parse('oz ^ 2 + oz * dz * t + dz * t * oz + t ^ 2 * dz ^ 2')],
        [math.parse('(o + d * t) ^ 4'), math.parse('4 * o ^ 3 * d * t + 4 * t ^ 3 * d ^ 3 * o + 3 * t ^ 2 * d ^ 2 * o ^ 2 + 3 * o ^ 2 * t ^ 2 * d ^ 2 + o ^ 4 + t ^ 4 * d ^ 4')],
        //[math.parse('(o + d * t) ^ 4'), math.parse('(ox + dx * t) ^ 4 + (oy + dy * t) ^ 4 + (oz + dz * t) ^ 4')],
        // [math.parse('(o + d * t) ^ 4'), math.parse('4 * ox ^ 3 * dx * t + 4 * t ^ 3 * dx ^ 3 * ox + 3 * t ^ 2 * dx ^ 2 * ox ^ 2 + 3 * ox ^ 2 * t ^ 2 * dx ^ 2 + ox ^ 4 + t ^ 4 * dx ^ 4 + 4 * oy ^ 3 * dy * t + 4 * t ^ 3 * dy ^ 3 * oy + 3 * t ^ 2 * dy ^ 2 * oy ^ 2 + 3 * oy ^ 2 * t ^ 2 * dy ^ 2 + oy ^ 4 + t ^ 4 * dy ^ 4 + 4 * oz ^ 3 * dz * t + 4 * t ^ 3 * dz ^ 3 * oz + 3 * t ^ 2 * dz ^ 2 * oz ^ 2 + 3 * oz ^ 2 * t ^ 2 * dz ^ 2 + oz ^ 4 + t ^ 4 * dz ^ 4')],
        [math.parse('(ox + dx * t) ^ 4'), math.parse('4 * ox ^ 3 * dx * t + 4 * t ^ 3 * dx ^ 3 * ox + 3 * t ^ 2 * dx ^ 2 * ox ^ 2 + 3 * ox ^ 2 * t ^ 2 * dx ^ 2 + ox ^ 4 + t ^ 4 * dx ^ 4')],
        [math.parse('(oy + dy * t) ^ 4'), math.parse('4 * oy ^ 3 * dy * t + 4 * t ^ 3 * dy ^ 3 * oy + 3 * t ^ 2 * dy ^ 2 * oy ^ 2 + 3 * oy ^ 2 * t ^ 2 * dy ^ 2 + oy ^ 4 + t ^ 4 * dy ^ 4')],
        [math.parse('(oz + dz * t) ^ 4'), math.parse('4 * oz ^ 3 * dz * t + 4 * t ^ 3 * dz ^ 3 * oz + 3 * t ^ 2 * dz ^ 2 * oz ^ 2 + 3 * oz ^ 2 * t ^ 2 * dz ^ 2 + oz ^ 4 + t ^ 4 * dz ^ 4')],
    ])

    node = substitute(node, secondSubstitutions)

    console.log("After second substitution: " + node.toString())

    //node = FastRationalize(node, 4)
    node = math.rationalize(node)

    console.log("Rationalized: " + node.toString())
    //let node = math.parse(eq)

    function printNode(node: math.MathNode, name: string): void {
        node = math.simplify(math.rationalize(node), [{l: 'v^2', r: 'v * v'}, {l: 'v^3', r: 'v * v * v'}, {l: 'v^4', r: 'v * v * v * v'}])
        //console.log(name + ": " + node.toString())
        //console.log(name + " S: " + math.simplify(node).toString())
        console.log(name + " R: " + node.toString())
        console.log(name + ' Prep: ' + StringEqParser.AddFractionToConstant(StringEqParser.PrepareVectorConstants(node)))
    }

    const zeroDegree = pickWithVariable(node, 0)
    printNode(zeroDegree, "Zero")

    const firstDegree = pickWithVariable(node, 1)
    printNode(firstDegree, "First")
    
    const secondDegree = pickWithVariable(node, 2)
    printNode(secondDegree, "Second")

    const thirdDegree = pickWithVariable(node, 3)
    printNode(thirdDegree, "Third")

    const fourthDegree = pickWithVariable(node, 4)
    printNode(fourthDegree, "Fourth")
}

type EqData = {
    coeffs: coeffs,
    gradient: gradient
}

export function GetEqData(eq: string): EqData {
    let firstSubstitutions = new Map<math.MathNode, math.MathNode>([
        [math.parse('x ^ 2 + y ^ 2 + z ^ 2'), math.parse('v ^ 2')]
    ])

    let node = substitute(math.parse(eq), firstSubstitutions)

    node = math.simplify(node, {
        v: math.parse("o + d * t"),
        x: math.parse("ox + dx * t"),
        y: math.parse("oy + dy * t"),
        z: math.parse("oz + dz * t")
    })


    let secondSubstitutions = new Map<math.MathNode, math.MathNode>([
        [math.parse('(o + d * t) ^ 2'), math.parse('o ^ 2 + o * d * t + d * t * o + t ^ 2 * d ^ 2')],
        // [math.parse('(o + d * t) ^ 2'), math.parse('(ox + dx * t) ^ 2 + (oy + dy * t) ^ 2 + (oz + dz * t) ^ 2')],
        //[math.parse('(o + d * t) ^ 4'), math.parse('o ^ 4 + o ^ 3 * d * t + o ^ 3 * d * t + o ^ 2 * t ^ 2 * d ^ 2 + o ^ 3 * d * t + t ^ 2 * d ^ 2 * o ^ 2 + o ^ 2 * t ^ 2 * d ^ 2 + t ^ 3 * d ^ 3 * o + o ^ 3 * d * t + t ^ 2 * d ^ 2 * o ^ 2 + o ^ 2 * t ^ 2 * d ^ 2 + t ^ 3 * d ^ 3 * o + t ^ 2 * d ^ 2 * o ^ 2 + t ^ 3 * d ^ 3 * o + t ^ 3 * d ^ 3 * o + t ^ 4 * d ^ 4')],
        [math.parse('(ox + dx * t) ^ 2'), math.parse('ox ^ 2 + ox * dx * t + dx * t * ox + t ^ 2 * dx ^ 2')],
        [math.parse('(oy + dy * t) ^ 2'), math.parse('oy ^ 2 + oy * dy * t + dy * t * oy + t ^ 2 * dy ^ 2')],
        [math.parse('(oz + dz * t) ^ 2'), math.parse('oz ^ 2 + oz * dz * t + dz * t * oz + t ^ 2 * dz ^ 2')],
        [math.parse('(o + d * t) ^ 4'), math.parse('4 * o ^ 3 * d * t + 4 * t ^ 3 * d ^ 3 * o + 3 * t ^ 2 * d ^ 2 * o ^ 2 + 3 * o ^ 2 * t ^ 2 * d ^ 2 + o ^ 4 + t ^ 4 * d ^ 4')],
        //[math.parse('(o + d * t) ^ 4'), math.parse('(ox + dx * t) ^ 4 + (oy + dy * t) ^ 4 + (oz + dz * t) ^ 4')],
        // [math.parse('(o + d * t) ^ 4'), math.parse('4 * ox ^ 3 * dx * t + 4 * t ^ 3 * dx ^ 3 * ox + 3 * t ^ 2 * dx ^ 2 * ox ^ 2 + 3 * ox ^ 2 * t ^ 2 * dx ^ 2 + ox ^ 4 + t ^ 4 * dx ^ 4 + 4 * oy ^ 3 * dy * t + 4 * t ^ 3 * dy ^ 3 * oy + 3 * t ^ 2 * dy ^ 2 * oy ^ 2 + 3 * oy ^ 2 * t ^ 2 * dy ^ 2 + oy ^ 4 + t ^ 4 * dy ^ 4 + 4 * oz ^ 3 * dz * t + 4 * t ^ 3 * dz ^ 3 * oz + 3 * t ^ 2 * dz ^ 2 * oz ^ 2 + 3 * oz ^ 2 * t ^ 2 * dz ^ 2 + oz ^ 4 + t ^ 4 * dz ^ 4')],
        [math.parse('(ox + dx * t) ^ 4'), math.parse('4 * ox ^ 3 * dx * t + 4 * t ^ 3 * dx ^ 3 * ox + 3 * t ^ 2 * dx ^ 2 * ox ^ 2 + 3 * ox ^ 2 * t ^ 2 * dx ^ 2 + ox ^ 4 + t ^ 4 * dx ^ 4')],
        [math.parse('(oy + dy * t) ^ 4'), math.parse('4 * oy ^ 3 * dy * t + 4 * t ^ 3 * dy ^ 3 * oy + 3 * t ^ 2 * dy ^ 2 * oy ^ 2 + 3 * oy ^ 2 * t ^ 2 * dy ^ 2 + oy ^ 4 + t ^ 4 * dy ^ 4')],
        [math.parse('(oz + dz * t) ^ 4'), math.parse('4 * oz ^ 3 * dz * t + 4 * t ^ 3 * dz ^ 3 * oz + 3 * t ^ 2 * dz ^ 2 * oz ^ 2 + 3 * oz ^ 2 * t ^ 2 * dz ^ 2 + oz ^ 4 + t ^ 4 * dz ^ 4')],
    ])

    node = substitute(node, secondSubstitutions)
    
    //node = FastRationalize(node, 4)
    node = math.rationalize(node)


    function prep (node: math.MathNode) {
        node = math.simplify(math.rationalize(node), [{l: 'v^2', r: 'v * v'}, {l: 'v^3', r: 'v * v * v'}, {l: 'v^4', r: 'v * v * v * v'}])
        return StringEqParser.AddFractionToConstant(StringEqParser.PrepareVectorConstants(node))
    }

    const coeffs: coeffs = {
        t0: prep(pickWithVariable(node, 0)),
        t1: prep(pickWithVariable(node, 1)),
        t2: prep(pickWithVariable(node, 2)),
        t3: prep(pickWithVariable(node, 3)),
        t4: prep(pickWithVariable(node, 4))
    }

    return {coeffs: coeffs, gradient: CalculateGradient(eq)}
}