
export default {
    Color: {
        Unknown: 0,
        Black: 1,
        White: 2
    },

    PosFlag: ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"],
}

/**
 * 单个点位
 */
export interface SinglePoint {
    x: number                       // 1~n
    y: number                       // 1~n
    color: number                   // 0空 1黑 2白
    stepStr: string                 // B[AA]
    dragonId?: number               // 属于哪条龙
    tigerPoints?: SinglePoint[]     // 虎口周围的棋子
    forbiddenPoints?: SinglePoint[]  // 组成禁入点的棋子
    forbiddenColor?: number         // 禁入的颜色
    robPoints?: SinglePoint[]       // 劫点周围的棋子
}

/**
 * 由n颗子组成的龙
 */
export interface SingleDragon {
    id: number                      // 龙的顺序
    dragonColor: number             // 龙的颜色
    boardSize: number               // 路数
    qiPoints: SinglePoint[]         // 活气的集合
    dragonPoints: SinglePoint[]     // 组成棋子的集合
    deadQiPoints: SinglePoint[]     // 死气的集合
}

/**
 * 由n条龙组成的棋谱
 */
export interface SingleQipu {
    boardSize: number               // 路数
    qipu: string                    // 标准棋谱
    boardArray: SinglePoint[][]     // 盘面
    dragons?: SingleDragon[]        // 棋谱所有龙的集合
    tigers?: SinglePoint[]           // 棋谱所有虎口的集合
    forbiddens?: SinglePoint[]       // 禁着点
    robs?: SinglePoint[]             // 劫点
    trueEyes?: SinglePoint[]         // 真眼
}
