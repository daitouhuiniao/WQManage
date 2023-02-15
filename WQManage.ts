/**
 * 棋谱管理
 *  author sunmengyang
 * 2022/12/1
 */

import WQComs from "./WQComs"
import { SinglePoint } from "./WQComs"
import { SingleDragon } from "./WQComs"
import { SingleQipu } from "./WQComs"

export class WQManage implements SingleQipu {

    qipu: string
    boardSize: number
    dragons: SingleDragon[]
    boardArray: SinglePoint[][]
    tigers: SinglePoint[]
    forbiddens: SinglePoint[]
    robs: SinglePoint[]
    trueEyes: SinglePoint[]

    constructor(qipu: string, boardSize: number) {
        this.qipu = qipu;
        this.boardSize = boardSize;
        this.dragons = [];
        this.tigers = [];
        this.forbiddens = [];
        this.robs = [];
        this.trueEyes = [];

        this.boardArray = transQipuToBoard(qipu, boardSize);
        this.dragons = this.getDragonsByBoard(this.boardArray);
        this.getAllTigers();
        this.getAllForbiddensAndRobs();
        this.getAllEyes();
    }

    /**
    * 根据盘面获取所有的龙
    * @returns 
    */
    getDragonsByBoard(_array: SinglePoint[][]) {
        let dragonId = 1;
        let dragons: SingleDragon[] = [];
        for (let idx = 0; idx < this.boardSize; idx++) {
            for (let idy = 0; idy < this.boardSize; idy++) {
                let point = _array[idx][idy];
                if (point.color > 0) {
                    // 判断该点是否在已分配的龙中
                    let isInDragon: number = this.checkAPointInSDragon(point, dragons);
                    if (isInDragon < 0) {
                        // 判断该点的上下左右是否在已分配的龙中
                        let inDragonArr = this.checkAPointBelongToThisDragon(point, dragons);
                        if (inDragonArr.length == 1 || (inDragonArr.length == 2 && inDragonArr[0].id == inDragonArr[1].id)) {
                            // 该点的上下左右属于某条龙
                            inDragonArr[0].dragonPoints.push(point);
                        } else if (inDragonArr.length == 2) {
                            // 当一个点属于两条龙时合并
                            inDragonArr[0].dragonPoints = inDragonArr[0].dragonPoints.concat(inDragonArr[1].dragonPoints);
                            inDragonArr[0].dragonPoints.push(point);
                            dragons.splice(inDragonArr[1].id - 1, 1);
                            dragonId--;
                        } else if (inDragonArr.length == 0) {
                            // 该点的上下左右都不属于某条龙 => 新建龙
                            let dragon: SingleDragon = {
                                id: dragonId++,
                                dragonColor: point.color,
                                boardSize: this.boardSize,
                                qiPoints: [],
                                dragonPoints: [],
                                deadQiPoints: []
                            }
                            dragon.dragonPoints.push(point);
                            dragons.push(dragon);
                        }
                    }
                }
            }
        }

        for (let idz in dragons) {
            for (let idy in dragons[idz].dragonPoints) {
                let qi = this.getQiInSPoint(dragons[idz].dragonPoints[idy]);
                let deadQi = this.getDeadQiInSPoint(dragons[idz].dragonPoints[idy], dragons[idz].dragonColor);
                dragons[idz].qiPoints = dragons[idz].qiPoints.concat(qi);
                dragons[idz].deadQiPoints = dragons[idz].deadQiPoints.concat(deadQi);
            }
            dragons[idz].qiPoints = uniq(dragons[idz].qiPoints);
            dragons[idz].deadQiPoints = uniq(dragons[idz].deadQiPoints);
        }

        return dragons;
    }

    /**
     * 计算盘面所有的虎口点
     */
    getAllTigers() {
        for (let idx = 0; idx < this.boardSize; idx++) {
            for (let idy = 0; idy < this.boardSize; idy++) {
                let point = this.boardArray[idx][idy];
                if (this.checkAPointIsTiger(point)) {
                    this.tigers.push(point);
                }
            }
        }
    }

    /**
     * 计算盘面所有的禁着点和劫点
     */
    getAllForbiddensAndRobs() {
        for (let idx = 0; idx < this.boardSize; idx++) {
            for (let idy = 0; idy < this.boardSize; idy++) {
                let point = this.boardArray[idx][idy];
                if (point.color == 0) {
                    let qi = this.getQiInSPoint(point);
                    if (qi.length == 0) {
                        let wDeadQi: SinglePoint[] = this.getDeadQiInSPoint(point, WQComs.Color.Black);
                        let bDeadQi: SinglePoint[] = this.getDeadQiInSPoint(point, WQComs.Color.White);
                        let DeadPointIfDown = this.checkIsEatIfDown(point);
                        if (DeadPointIfDown.length == 0) {
                            point.forbiddenPoints = wDeadQi.concat(bDeadQi);
                            this.forbiddens.push(point);
                        } else if (DeadPointIfDown.length == 1) {
                            point.robPoints = wDeadQi.concat(bDeadQi);
                            this.robs.push(point);
                        }
                    }
                }
            }
        }
    }

    /**
     * 计算盘面所有的真眼
     */
    getAllEyes() {
        let forbiddrensBoard = clone(this.boardArray);
        for (let idx = 0; idx < this.forbiddens.length; idx++) {
            let newColor = this.forbiddens[idx].forbiddenColor == WQComs.Color.Black ? WQComs.Color.White : WQComs.Color.Black;
            forbiddrensBoard[this.forbiddens[idx].y - 1][this.forbiddens[idx].x - 1].color = newColor;
        }
        let forbiddrensDragons: SingleDragon[] = this.getDragonsByBoard(forbiddrensBoard);
        for (let idx = 0; idx < this.forbiddens.length; idx++) {
            let color = this.forbiddens[idx].forbiddenColor == WQComs.Color.Black ? WQComs.Color.White : WQComs.Color.Black;
            // 默认四个斜角都不存在
            let topLeftDId = 0;
            let bottomLeftDId = 0;
            let bottomRightDId = 0;
            let topRightDId = 0;
            if (forbiddrensBoard[this.forbiddens[idx].y - 1 - 1] && forbiddrensBoard[this.forbiddens[idx].y - 1 - 1][this.forbiddens[idx].x - 1 - 1]) {
                // 左上存在
                let topLeft = forbiddrensBoard[this.forbiddens[idx].y - 1 - 1][this.forbiddens[idx].x - 1 - 1];
                if (topLeft.color == color) {
                    // 左上同色棋子
                    topLeftDId = this.checkAPointInSDragon(topLeft, forbiddrensDragons);
                } else {
                    // 左上异色棋子
                    topLeftDId = -1;
                }
            }
            if (forbiddrensBoard[this.forbiddens[idx].y - 1 + 1] && forbiddrensBoard[this.forbiddens[idx].y - 1 + 1][this.forbiddens[idx].x - 1 - 1]) {
                // 左下存在
                let bottomLeft = forbiddrensBoard[this.forbiddens[idx].y - 1 + 1][this.forbiddens[idx].x - 1 - 1];
                if (bottomLeft.color == color) {
                    bottomLeftDId = this.checkAPointInSDragon(bottomLeft, forbiddrensDragons);
                } else {
                    // 左下异色棋子
                    bottomLeftDId = -1;
                }
            }
            if (forbiddrensBoard[this.forbiddens[idx].y - 1 + 1] && forbiddrensBoard[this.forbiddens[idx].y - 1 + 1][this.forbiddens[idx].x - 1 + 1]) {
                // 右下存在
                let bottomRight = forbiddrensBoard[this.forbiddens[idx].y - 1 + 1][this.forbiddens[idx].x - 1 + 1];
                if (bottomRight.color == color) {
                    bottomRightDId = this.checkAPointInSDragon(bottomRight, forbiddrensDragons);
                } else {
                    // 左下异色棋子
                    bottomRightDId = -1;
                }
            }
            if (forbiddrensBoard[this.forbiddens[idx].y - 1 - 1] && forbiddrensBoard[this.forbiddens[idx].y - 1 - 1][this.forbiddens[idx].x - 1 + 1]) {
                // 右上存在
                let topRight = forbiddrensBoard[this.forbiddens[idx].y - 1 - 1][this.forbiddens[idx].x - 1 + 1];
                if (topRight.color == color) {
                    topRightDId = this.checkAPointInSDragon(topRight, forbiddrensDragons);
                } else {
                    // 左下异色棋子
                    topRightDId = -1;
                }
            }
            if (topLeftDId > 0 && bottomLeftDId > 0 && bottomRightDId > 0 && topRightDId > 0) {
                if (topLeftDId == bottomLeftDId && bottomLeftDId == bottomRightDId && bottomRightDId == topRightDId) {
                    this.trueEyes.push(this.forbiddens[idx]);
                }
                continue;
            } else if (topLeftDId < 0 && bottomLeftDId > 0 && bottomRightDId > 0 && topRightDId > 0) {
                if (bottomLeftDId == bottomRightDId && bottomRightDId == topRightDId) {
                    this.trueEyes.push(this.forbiddens[idx]);
                }
                continue;
            } else if (topLeftDId > 0 && bottomLeftDId < 0 && bottomRightDId > 0 && topRightDId > 0) {
                if (topLeftDId == bottomRightDId && bottomRightDId == topRightDId) {
                    this.trueEyes.push(this.forbiddens[idx]);
                }
                continue;
            } else if (topLeftDId > 0 && bottomLeftDId > 0 && bottomRightDId < 0 && topRightDId > 0) {
                if (topLeftDId == bottomLeftDId && bottomLeftDId == topRightDId) {
                    this.trueEyes.push(this.forbiddens[idx]);
                }
                continue;
            } else if (topLeftDId > 0 && bottomLeftDId > 0 && bottomRightDId > 0 && topRightDId < 0) {
                if (topLeftDId == bottomLeftDId && bottomLeftDId == bottomRightDId) {
                    this.trueEyes.push(this.forbiddens[idx]);
                }
                continue;
            } else if (topLeftDId == 0 && topRightDId == 0 && bottomLeftDId > 0 && bottomRightDId > 0) {
                if (bottomLeftDId == bottomRightDId) {
                    this.trueEyes.push(this.forbiddens[idx]);
                }
                continue;
            } else if (topLeftDId == 0 && bottomLeftDId == 0 && topRightDId > 0 && bottomRightDId > 0) {
                if (topRightDId == bottomRightDId) {
                    this.trueEyes.push(this.forbiddens[idx]);
                }
                continue;
            } else if (topRightDId == 0 && bottomRightDId == 0 && topLeftDId > 0 && bottomLeftDId > 0) {
                if (topLeftDId == bottomLeftDId) {
                    this.trueEyes.push(this.forbiddens[idx]);
                }
                continue;
            } else if (bottomLeftDId == 0 && bottomRightDId == 0 && topLeftDId > 0 && topRightDId > 0) {
                if (topLeftDId == topRightDId) {
                    this.trueEyes.push(this.forbiddens[idx]);
                }
                continue;
            } else if (topLeftDId > 0 && topRightDId == 0 && bottomLeftDId == 0 && bottomRightDId == 0) {
                this.trueEyes.push(this.forbiddens[idx]);
                continue;
            } else if (topLeftDId == 0 && topRightDId > 0 && bottomLeftDId == 0 && bottomRightDId == 0) {
                this.trueEyes.push(this.forbiddens[idx]);
                continue;
            } else if (topLeftDId == 0 && topRightDId == 0 && bottomLeftDId > 0 && bottomRightDId == 0) {
                this.trueEyes.push(this.forbiddens[idx]);
                continue;
            } else if (topLeftDId == 0 && topRightDId == 0 && bottomLeftDId == 0 && bottomRightDId > 0) {
                this.trueEyes.push(this.forbiddens[idx]);
                continue;
            }

        }
    }

    /**
     * 判断该点在已分配的龙里的id
     * @param point 
     * @returns 
     */
    checkAPointInSDragon(point: SinglePoint, dragons: SingleDragon[]) {
        for (let idx in dragons) {
            for (let idy in dragons[idx].dragonPoints) {
                if (dragons[idx].dragonPoints[idy].x == point.x &&
                    dragons[idx].dragonPoints[idy].y == point.y &&
                    dragons[idx].dragonColor == point.color) {
                    return dragons[idx].id;
                }
            }
        }
        return -1;
    }

    /**
     * 检查这个点的上下左右属于某条龙
     * @param point 
     */
    checkAPointBelongToThisDragon(point: SinglePoint, dragons: SingleDragon[]) {
        let bDragons: SingleDragon[] = [];
        for (let idx in dragons) {
            for (let idy in dragons[idx].dragonPoints) {
                if (dragons[idx].dragonPoints[idy].x == point.x - 1 &&
                    dragons[idx].dragonPoints[idy].y == point.y &&
                    dragons[idx].dragonColor == point.color) {
                    bDragons.push(dragons[idx]);
                } else if (dragons[idx].dragonPoints[idy].x == point.x + 1 &&
                    dragons[idx].dragonPoints[idy].y == point.y &&
                    dragons[idx].dragonColor == point.color) {
                    bDragons.push(dragons[idx]);
                } else if (dragons[idx].dragonPoints[idy].x == point.x &&
                    dragons[idx].dragonPoints[idy].y == point.y - 1 &&
                    dragons[idx].dragonColor == point.color) {
                    bDragons.push(dragons[idx]);
                } else if (dragons[idx].dragonPoints[idy].x == point.x &&
                    dragons[idx].dragonPoints[idy].y == point.y + 1 &&
                    dragons[idx].dragonColor == point.color) {
                    bDragons.push(dragons[idx]);
                }
            }
        }
        return bDragons;
    }

    /**
    * 检查这个点的是否为虎口
    * @param point 
    */
    checkAPointIsTiger(point: SinglePoint) {
        if (point.color != 0) {
            return false;
        }
        let qi: SinglePoint[] = this.getQiInSPoint(point);
        let wDeadQi: SinglePoint[] = this.getDeadQiInSPoint(point, WQComs.Color.Black);
        let bDeadQi: SinglePoint[] = this.getDeadQiInSPoint(point, WQComs.Color.White);
        if (qi.length == 1) {
            if (wDeadQi.length == 0) {
                point.tigerPoints = bDeadQi;
                return true;
            } else if (bDeadQi.length == 0) {
                point.tigerPoints = wDeadQi;
                return true;
            }
        } else {
            return false;
        }
    }

    /**
     * 计算单个点的气
     * @param point 
     * @returns SinglePoint[]
     */
    getQiInSPoint(point: SinglePoint) {
        let qi: SinglePoint[] = [];
        if (this.boardArray[point.y - 1 - 1] &&
            this.boardArray[point.y - 1 - 1][point.x - 1] &&
            this.boardArray[point.y - 1 - 1][point.x - 1].color == 0) {
            qi.push(this.boardArray[point.y - 1 - 1][point.x - 1]);
        }
        if (this.boardArray[point.y + 1 - 1] &&
            this.boardArray[point.y + 1 - 1][point.x - 1] &&
            this.boardArray[point.y + 1 - 1][point.x - 1].color == 0) {
            qi.push(this.boardArray[point.y + 1 - 1][point.x - 1]);
        }
        if (this.boardArray[point.y - 1] &&
            this.boardArray[point.y - 1][point.x + 1 - 1] &&
            this.boardArray[point.y - 1][point.x + 1 - 1].color == 0) {
            qi.push(this.boardArray[point.y - 1][point.x + 1 - 1]);
        }
        if (this.boardArray[point.y - 1] &&
            this.boardArray[point.y - 1][point.x - 1 - 1] &&
            this.boardArray[point.y - 1][point.x - 1 - 1].color == 0) {
            qi.push(this.boardArray[point.y - 1][point.x - 1 - 1]);
        }
        return qi;
    }

    /**
     * 计算单个点的死气
     * @param point dColor
     * @returns SinglePoint[]
     */
    getDeadQiInSPoint(point: SinglePoint, dColor: number) {
        let deadQi: SinglePoint[] = [];
        let otherColor = dColor == WQComs.Color.Black ? WQComs.Color.White : WQComs.Color.Black;
        if (this.boardArray[point.y - 1 - 1] &&
            this.boardArray[point.y - 1 - 1][point.x - 1] &&
            this.boardArray[point.y - 1 - 1][point.x - 1].color == otherColor) {
            deadQi.push(this.boardArray[point.y - 1 - 1][point.x - 1]);
        }
        if (this.boardArray[point.y + 1 - 1] &&
            this.boardArray[point.y + 1 - 1][point.x - 1] &&
            this.boardArray[point.y + 1 - 1][point.x - 1].color == otherColor) {
            deadQi.push(this.boardArray[point.y + 1 - 1][point.x - 1]);
        }
        if (this.boardArray[point.y - 1] &&
            this.boardArray[point.y - 1][point.x + 1 - 1] &&
            this.boardArray[point.y - 1][point.x + 1 - 1].color == otherColor) {
            deadQi.push(this.boardArray[point.y - 1][point.x + 1 - 1]);
        }
        if (this.boardArray[point.y - 1] &&
            this.boardArray[point.y - 1][point.x - 1 - 1] &&
            this.boardArray[point.y - 1][point.x - 1 - 1].color == otherColor) {
            deadQi.push(this.boardArray[point.y - 1][point.x - 1 - 1]);
        }
        return deadQi;
    }

    /**
     * 计算单个点如果落下之后的死龙情况
     * @param point dColor
     * @returns SinglePoint[]
     */
    checkIsEatIfDown(point: SinglePoint) {
        let ifDownColorBlackBoard = clone(this.boardArray);
        let ifDownColorWhiteBoard = clone(this.boardArray);
        // 计算只剩一口气的龙
        let oneQiDragons: SingleDragon[] = [];
        for (let idx in this.dragons) {
            if (this.dragons[idx].qiPoints.length == 1) {
                oneQiDragons.push(this.dragons[idx]);
            }
        }
        let ifDeadDragons: SingleDragon[] = [];
        // 如果落黑子在此处
        point.color = WQComs.Color.Black;
        ifDownColorBlackBoard[point.y - 1][point.x - 1].color = WQComs.Color.Black;
        let ifDownBlackDragons: SingleDragon[] = this.getDragonsByBoard(ifDownColorBlackBoard);

        for (let idx in ifDownBlackDragons) {
            if (ifDownBlackDragons[idx].qiPoints.length == 0 && ifDownBlackDragons[idx].dragonColor == WQComs.Color.Black) {
                ifDeadDragons.push(ifDownBlackDragons[idx]);
                point.forbiddenColor = WQComs.Color.Black;
            }
        }
        // 如果落白子在此处
        point.color = WQComs.Color.White;
        ifDownColorWhiteBoard[point.y - 1][point.x - 1].color = WQComs.Color.White;
        let ifDownWhiteDragons: SingleDragon[] = this.getDragonsByBoard(ifDownColorWhiteBoard);
        for (let idx in ifDownWhiteDragons) {
            if (ifDownWhiteDragons[idx].qiPoints.length == 0 && ifDownWhiteDragons[idx].dragonColor == WQComs.Color.White) {
                ifDeadDragons.push(ifDownWhiteDragons[idx]);
                point.forbiddenColor = WQComs.Color.White;
            }
        }
        // 恢复
        point.color = WQComs.Color.Unknown;
        // 当原本一口气的龙 落了之后死了
        let almostDeadDragons: SingleDragon[] = [];
        for (let idx in oneQiDragons) {
            let stepStr = JSON.stringify(oneQiDragons[idx].dragonPoints);
            for (let idy in ifDeadDragons) {
                let deadStepStr = JSON.stringify(ifDeadDragons[idy].dragonPoints);
                if (stepStr == deadStepStr) {
                    almostDeadDragons.push(oneQiDragons[idx]);
                }
            }
        }
        return almostDeadDragons;
    }
}

/**
* 棋谱转baord
* @param qipu
*/
function transQipuToBoard(qipu: string, boardSize: number) {
    let board: SinglePoint[][] = [];
    for (let idx = 0; idx < boardSize; idx++) {
        board.push([]);
        for (let idy = 0; idy < boardSize; idy++) {
            board[idx][idy] = {
                x: idy + 1,
                y: idx + 1,
                color: 0,
                stepStr: WQComs.PosFlag[idy] + WQComs.PosFlag[idx],
                forbiddenPoints: []
            };
        }
    }
    let arr: string[] = qipu.split(";");
    arr.pop();
    for (let idx in arr) {
        let color: number = arr[idx][0] == "B" ? 1 : 2;
        let y: number = WQComs.PosFlag.indexOf(arr[idx][2]);
        let x: number = WQComs.PosFlag.indexOf(arr[idx][3]);
        let stepStr: string = arr[idx];
        board[x][y] = {
            x: y + 1,
            y: x + 1,
            color: color,
            stepStr: stepStr,
            forbiddenPoints: []
        };
    }
    return board;
}

/**
 * 数组去重
 */
function uniq(_arr: Array<any>) {
    var arr = <any>[];
    var flag = true;
    _arr.forEach(function (item) {
        // 排除 NaN (重要！！！)
        if (item != item) {
            flag && arr.indexOf(item) === -1 ? arr.push(item) : '';
            flag = false;
        } else {
            arr.indexOf(item) === -1 ? arr.push(item) : ''
        }
    });
    return arr;
}

/**
 * 深拷贝
 */
function clone(src: any) {
    if (!src || typeof (src) !== "object") {
        return src;
    }
    var out = (src.constructor === Array) ? [] : {};
    var _clone = function (o: any, c: any) {
        for (var i in o) {
            if (o[i] && typeof o[i] === 'object') {
                if (o[i].constructor === Array) {
                    c[i] = [];
                } else {
                    c[i] = {};
                }
                _clone(o[i], c[i]);
            } else {
                c[i] = o[i];
            }
        }
        return c
    }
    return _clone(src, out);
}

