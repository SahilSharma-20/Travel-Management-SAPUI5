sap.ui.define(["sap/ui/model/json/JSONModel"], function (JSONModel) {
    "use strict";

    return {
        createClaimsModel: function () {
            var oData = {
                claimsInProcess: [] // shared claims data
            };
            return new JSONModel(oData);
        }
    };
});
