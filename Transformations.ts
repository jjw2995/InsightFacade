import {InsightError} from "../controller/IInsightFacade";
import Decimal from "decimal.js";

export default class Transformations {
    private isempty: boolean = true;
    private group: any = null;
    private apply: any = null;
    private groupApplyList: any[] = [];

    constructor(transformations: any) {
        if (!transformations) {
            return;
        }
        this.isempty = false;
        this.condErr(transformations.constructor !== Object, "transformations not an object");
        let group = transformations.GROUP;
        let apply = transformations.APPLY;
        this.condErr(!Array.isArray(group), "trans-group not an array");
        this.condErr(group.length < 1, "trans-group is invalid");
        this.condErr(!Array.isArray(apply), "trans-apply not an array");
        this.group = group;
        this.apply = apply;
        this.groupApplyList = group.slice();
    }

    public isEmpty() {
        return this.isempty;
    }

    private condErr(cond: boolean, message: string) {
        if (cond) {
            throw new InsightError(message);
        }
    }

    public transform(listing: any[]): any[] {
        // form groups
        let groupedList: any = {};
        for (let elem of listing) {
            let key = this.groupKey(elem);
            if (groupedList.hasOwnProperty(key)) {
                groupedList[key].push(elem);
            } else {
                groupedList[key] = [elem];
            }
        }

        // after grouping the original listing

        let rlist: any[] = [];
        let apKeyTokTranskeyL: any[] = [];
        // insert applyKeys and its fields into obj
        for (let applyRule of this.apply) {
            let applyKeytokenKeyL = this.validateDissectApply(applyRule);
            let applyKey = applyKeytokenKeyL[0];

            // get result on a token for this Indiv group
            apKeyTokTranskeyL.push(applyKeytokenKeyL);
            this.groupApplyList.push(applyKey);
        }

        for (let ind in groupedList) {
            let indivGroup = groupedList[ind];
            let value = indivGroup[0];
            let obj: any = {};
            // insert groupKeys and its fields into obj
            for (let groupKey of this.group) {
                obj[groupKey] = value[groupKey];
            }

            // insert applyKeys and its fields into obj
            for (let elem of apKeyTokTranskeyL) {
                let applyKey = elem[0];
                let token = elem[1];
                let transkey = elem[2];

                // get result on a token for this Indiv group
                obj[applyKey] = this.opTokenOnEachGroup(indivGroup, token, transkey);
            }
            rlist.push(obj);
        }
        let groupApplyUniqueTest = new Set(this.groupApplyList);
        this.condErr(this.groupApplyList.length !== groupApplyUniqueTest.size, "ApplyKey Not Unique - transform");
        return rlist;
    }

    /** 
     * @param indivGroup
     * @param token
     * @param transkey
     */
    private opTokenOnEachGroup(indivGroup: any, token: string, transkey: string): any {
        let rv: any;
        let opList = [];

        for (let elem of indivGroup) {
            let operated = elem[transkey];
            let test = (typeof operated !== "string") && (typeof operated !== "number");
            this.condErr(test, "such key does not exist - transform");
            this.validateToken(token, operated);
            opList.push(operated);
        }
        return this.resultGivenTokenOpList(token, opList);
    }

    private resultGivenTokenOpList(token: string, opList: any) {
        let rv: any = null;
        switch (token) {
            case "MAX":
                rv = Math.max(...opList);
                break;
            case "MIN":
                rv = Math.min(...opList);
                break;
            case "AVG":
                let total = new Decimal(0);
                for (let elem of opList) {
                    total = total.add(elem);
                }

                let avg = 0.00;
                if (opList.length > 0) {
                    avg = total.toNumber() / opList.length;
                }
                rv = Number(avg.toFixed(2));
                break;
            case "SUM":
                let sum = opList.reduce((a: number, b: number) => a + b, 0);
                rv = Number(sum.toFixed(2));
                break;
            case "COUNT":
                let set = new Set(opList);
                rv = set.size;
                break;
        }
        return rv;
    }

    private validateDissectApply(applyRule: any) {
        this.condErr(applyRule.constructor !== Object, "an applyRule not an Object - Transform");
        let applyRuleL = Object.entries(applyRule);
        /** catches two applykeys within one applyrule
         *  "APPLY"{
         *    "applyKey": {"MAX": "courses_avg"},
         *    "applyKey": {"MIN": "courses_avg"}
         *    }
         */
        this.condErr(applyRuleL.length !== 1, "invalid applyrule");

        let inner = applyRuleL[0];


        let applyKey = inner[0];
        let applyTokenKey = inner[1];
        this.condErr(typeof applyKey !== "string", "");
        this.condErr(applyTokenKey.constructor !== Object, "TokenKey combo Not an Object");

        let tokenKeyL = Object.entries(applyTokenKey);
        /** catches
         *  {"applyKey": {MAX: "courses_avg",
         *                MIN: "courses_title"}}
         */
        this.condErr(tokenKeyL.length !== 1, "token:key combo !== 1");

        let token = tokenKeyL[0][0];
        let transKey = tokenKeyL[0][1];
        this.condErr(typeof transKey !== "string", "key must be a string - transform");
        let rl = [applyKey, token, transKey];
        return rl;
    }

    private validateToken(token: string, operated: any) {
        let test = typeof operated;
        switch (token) {
            case "MAX":
            case "MIN":
            case "AVG":
            case "SUM":
                this.condErr(test !== "number", "Invalid type for token");
                break;
            case "COUNT":
                this.condErr(test !== "number" && test !== "string", "Invalid type for token");
                break;
            default:
                throw new InsightError("Invalid token - transform");
        }
    }

    private groupKey(elem: any) {
        let rv = "";
        for (let key of this.group) {
            rv = rv + elem[key] + ";";
        }
        return rv;
    }

    public getGroupApplyList (): any {
        return this.groupApplyList;
    }
}
