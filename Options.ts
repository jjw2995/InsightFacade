import {InsightError} from "../controller/IInsightFacade";

export default class Options {
    private options: any = null;
    private id: any = null;

    private orderingList: string[] = [];
    private dir: string = "UP";
    private columns: string[] = [];

    constructor(options: any) {
        this.options = options;
        this.condErr(options === null || options === undefined, "Options null/undef - Options");
        this.condErr(options.constructor !== Object, "options not an Object");
        this.validateOptionAndInitID();
    }

    private condErr(cond: boolean, message: string) {
        if (cond) {
            throw new InsightError(message);
        }
    }

    private validateOptionAndInitID() {
        let options = this.options;
        let columns = options.COLUMNS;
        let order = options.ORDER;
        this.columns = columns;
        // columns check done ?
        this.condErr(!Array.isArray(columns), "columns Not array - Options");
        this.condErr(columns.length < 1, "columns leng < 1 - Options");
        for (let col of columns) {
            this.condErr(typeof col !== "string", "column not a string");
        }
        // columns check
        // options leng 2
        //  check order
        if (Object.entries(options).length === 2) {
            this.condErr(order === null || order === undefined, "order invalid - Options");
            // dissect order
            if (typeof order === "string") {
                // "ORDER": "key | applykey"
                // BELOW: can we have applykey that is empty string?
                // this.condErr(order.length < 1, "");
                this.orderingList.push(order);
            } else if (order.constructor === Object) {
                this.condErr(!Array.isArray(order.keys) || typeof order.dir !== "string", "Invalid order - Options");
                this.condErr(order.keys.length < 1, "order key list cannot be empty - Options");
                this.orderingList = order.keys.slice();
                this.dir = order.dir;
            } else {
                this.condErr(true, "order invalid");
            }
        }

        if (this.orderingList.length > 0) {
            for (let elem of this.orderingList) {
                if (!columns.includes(elem)) {
                    this.condErr(true, "order !== columns");
                }
            }
        }

        for (let elem of columns) {
            if (elem.includes("_")) {
                let d = elem.split("_");
                this.initAndCheckID(d[0]);
            }
        }
    }
    public getID() {
        return this.id;
    }

    private initAndCheckID(id: string) {
        if ((this.id === null) && id) {
            this.id = id;
        } else {
            if (this.id !== id) {
                throw new InsightError("ID Invalid - Options");
            }
        }
    }

    public createList(givenList: any[], groupApplyList: string[]): any[] {
        let columns = this.columns;
        if (groupApplyList.length > 0) {
            for (let elem of columns) {
                this.condErr(!groupApplyList.includes(elem), "columns-group/apply inconsistent - Options");
            }
        }

        let rlist = [];
        try {
            for (let element of givenList) {
                let obj: any = {};
                for (let elem of this.columns) {
                    if (element[elem] === undefined) {
                        throw new InsightError("such key does not exists - create list - Options");
                    }
                    obj[elem] = element[elem];
                }
                rlist.push(obj);
            }

            let olist = this.orderingList;
            let dir = this.dir;
            if (olist.length > 0) {
                function sortMultiKey(keys: any, dirE: any): any {
                    return (a: any, b: any) => {
                        let i = 0;
                        let next = 0;
                        let length = keys.length;
                        while (length > i && next === 0) {
                            let entry = keys[i];
                            if (dirE === "DOWN") {
                                next = a[entry] > b[entry] ? -1 : (a[entry] < b[entry] ? 1 : 0);
                            } else if (dirE === "UP") {
                                next = a[entry] > b[entry] ? 1 : (a[entry] < b[entry] ? -1 : 0);
                            }
                            i++;
                        }
                        return next;
                    };
                }
                rlist.sort(sortMultiKey(olist, dir));
            }
        } catch (e) {
            throw new InsightError("key not in element - create list - Options");
        }

        return rlist;
    }
}
