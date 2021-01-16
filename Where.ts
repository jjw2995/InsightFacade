import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";

/**
 * AND, OR (one or more filter)
 * LT, GT, EQ (terminal filter)
 *
 * dept, id, instructor, title, uuid : string;
 * avg, pass, fail, audit, year: number;
 */

export default class Where {
    private clause: any;
    private filter: string;
    private id: string = null;
    private isempty: boolean = true;
    private datasetKind: any;

    constructor(where: any, datasetKind: any) {
        this.datasetKind = datasetKind;
        this.clause = where;
        this.checkUndefNulEmpty(where);

        if (where.constructor !== Object) {
            throw new InsightError("where not an Object - Where");
        }
        if (Object.keys(where).length > 0) {
            this.isempty = false;
            this.validateNbuildFilter();
        }
    }

    private validateNbuildFilter() {
        this.filter = this.recurciveBuild(this.clause);
    }

    public getFilter() {
        return "return " + this.filter;
    }

    private recurciveBuild(curBody: any): string {
        let strfilter: string = Object.keys(curBody)[0];
        let logicOp: string = this.filterToStr(strfilter);
        switch (strfilter) {
            case "AND":
            case "OR":
            case "NOT":
                return this.nonTerminal(Object.values(curBody), logicOp);

            case "LT":
            case "GT":
            case "EQ":
            case "IS":
                return this.terminal(Object.values(curBody), logicOp);

            default:
                throw new InsightError("Key/Query is Invalid");
        }
    }

    private nonTerminal(ent: any, operand: string): string {
        this.checkUndefNulEmpty(ent);
        this.checkUndefNulEmpty(ent[0]);
        let rv = "";
        if (operand === "") {
            // it is a 'NOT' TODO: check { } for "NOT", and one thing only
            rv = "!(" +  this.recurciveBuild(ent[0]) + ")";
        } else { // TODO: check [ ] for "AND|OR"
            if (Object.values(ent[0]).length < 1) {
                throw new InsightError("And/Or need at least 1 body");
            }
            if (operand === "&&") {
                rv = "(true";
            } else {
                rv = "(false";
            }
            for (let i = 0; i < ent[0].length; i++) {
                rv = rv + operand + this.recurciveBuild(Object.values(ent[0])[i]);
            }
            rv = rv + ")";
        }
        return rv;
    }

    private terminal(ent: any, operand: string): string {
        this.checkUndefNulEmpty(ent);
        let rv = "";
        this.checkUndefNulEmpty(ent[0]);
        let value = Object.values(ent[0])[0];
        let idKey = Object.keys(ent[0]).toString().split("_");
        let id = idKey[0];
        let key = idKey[1];
        this.retNumStr(key);

        this.initAndCheckID(id);
        rv = "(section[\"" + id + "_" + key + "\"]";
        if (operand === "") {
            if (value !== "") {
                this.checkUndefNulEmpty(value);
            }
            if (typeof(value) !== "string" || this.retNumStr(key) !== "string") {
                throw new InsightError("IS: given other than string");
            }
            let isWildFront = value.startsWith("*");
            let isWildEnd = value.endsWith("*");

            if (isWildFront && isWildEnd) { // *asd*
                value = value.slice(1, value.length - 1);
                rv = rv + ".includes(\"" + value + "\"))";
            } else if (isWildFront) {       // *asd
                value = value.slice(1, value.length);
                rv = rv + ".endsWith(\"" + value + "\"))";
            } else if (isWildEnd) {         // asd*
                value = value.slice(0, value.length - 1);
                rv = rv + ".startsWith(\"" + value + "\"))";
            } else {                        // regular total match
                rv = rv + " ===\"" + value + "\")";
            }

            if (value.includes("*")) {
                throw new InsightError("* is not valid string");
            }

        } else {
            // number comparator
            this.checkUndefNulEmpty(value);
            if (typeof(value) !== "number" || this.retNumStr(key) !== "number") {
                throw new InsightError("IS: given other than string");
            }
            rv = rv + operand + value.toString() + ")";
        }
        return rv;
    }

    private filterToStr(strfilter: string): string {
        switch (strfilter) {
            // non_terminal - one TO many
            case "AND":
                return "&&";
            case "OR":
                return "||";
            case "NOT":
                return "";
            // terminal - comparator
            case "LT":
                return "<";
            case "GT":
                return ">";
            case "EQ":
                return "===";
            case "IS":
                return "";
            default:
                throw new InsightError("filter not valid - Where");
        }
    }

    private retNumStr(key: string): string {
        if (this.datasetKind === InsightDatasetKind.Courses) {
            switch (key) {
                case "dept":
                case "id":
                case "instructor":
                case "title":
                case "uuid":
                    return "string";
                case "avg":
                case "pass":
                case "fail":
                case "audit":
                case "year":
                    return "number";
            }
        } else {
            switch (key) {
                case "fullname":
                case "shortname":
                case "number":
                case "name":
                case "address":
                case "type":
                case "furniture":
                case "href":
                    return "string";

                case "lat":
                case "lon":
                case "seats":
                    return "number";
            }
        }
        throw new InsightError("Such key does not exist for given dataset - Where");
    }

    private checkUndefNulEmpty (elem: any): any {
        if (elem === "" || elem === null || elem === undefined) {
            throw new InsightError("Cannot be empty, undef, or null");
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
                throw new InsightError("ID Invalid - WHERE");
            }
        }
    }

    public isEmpty() {
        return this.isempty;
    }
}
