UBC CPSC-310 prefers students to keep this project private, so I'll only show the snippets that I'm most proud of 

After zip files have been processed and stored internally, when user requests a query, it calls perform query function below.

It then calls on Where, Tranformations, and Options classes which together processes the query in question

```js
// EXAMPLE QUERY

// {
//   "WHERE": {
//       "AND": [{
//           "IS": {
//               "rooms_furniture": "*Tables*"
//           }
//       }, {
//           "GT": {
//               "rooms_seats": 300
//           }
//       }]
//   },
//   "OPTIONS": {
//       "COLUMNS": [
//           "rooms_shortname",
//           "maxSeats"
//       ],
//       "ORDER": {
//           "dir": "DOWN",
//           "keys": ["maxSeats"]
//       }
//   },
//   "TRANSFORMATIONS": {
//       "GROUP": ["rooms_shortname"],
//       "APPLY": [{
//           "maxSeats": {
//               "MAX": "rooms_seats"
//           }
//       }]
//   }
// }

    
    public performQuery(query: any): Promise <any[]> {
        try {
            this.keepIDsInSync();
            // check valid query
            this.checkUndefNulEmptyInsightError(query, "invalid query - InsightFacade");
            let leng = Object.values(query).length;
            if (leng !== 2 && leng !== 3) {
                throw new InsightError("query invalid - InsightFacade");
            }

            // init OPTIONS object with COLUMNS check first
            let options = new Options(query.OPTIONS);
            let idIdx = this.idIdxFinder(options.getID());
            if (idIdx === -1) {
                throw new InsightError("ID not found - InsightFacade");
            }
            let objOfInterest = this.IDs[idIdx];
            let listing: any[] = objOfInterest.dataset;
            
            let datasetKind: any = objOfInterest.DSinfo.kind;

            // init WHERE object and create filter (if {}, no need to filter)
            let where = new Where(query.WHERE, datasetKind);
            if (!where.isEmpty()) {
                // cross id check
                if (where.getID() !== options.getID()) {
                    throw new InsightError("ID does not match - InsightFacade");
                }
                let isPass = Function("section", where.getFilter());
                listing = listing.filter(function (section) {
                    if (isPass(section)) {
                        return section;
                    }
                });
            }

            // if TRANSFORMATIONS
            let tranformations = new Transformations(query.TRANSFORMATIONS);
            if (!tranformations.isEmpty()) {
                listing = tranformations.transform(listing);
            }

            // pass modified list to OPTIONS column and create list
            listing = options.createList(listing, tranformations.getGroupApplyList());

            // return the listing
            if (listing.length > 5000) {
                throw new InsightError("Over 5000 results - InsightFacade");
            }
            return Promise.resolve(listing);
        } catch (e) {
            return Promise.reject(e);
        }
    }
```
