sap.ui.define([
    "sap/ui/core/UIComponent",
    "tvl/mgm/travelmanagement/model/models",
    "tvl/mgm/travelmanagement/model/claims"
], function (UIComponent, models, claimsModel) {
    "use strict";

    return UIComponent.extend("tvl.mgm.travelmanagement.Component", {
        metadata: { manifest: "json", interfaces: ["sap.ui.core.IAsyncContentCreation"] },

        init() {
            UIComponent.prototype.init.apply(this, arguments);

            // device model
            this.setModel(models.createDeviceModel(), "device");

            // shared claims model
            this.setModel(claimsModel.createClaimsModel(), "claims");

            // initialize router
            this.getRouter().initialize();
        }
    });
});