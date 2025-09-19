sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast"
], function (Controller, JSONModel, Fragment, MessageToast) {
    "use strict";

    return Controller.extend("tvl.mgm.travelmanagement.controller.Main", {

        onInit: function () {
            var oData = {
                savedExpenses: [],
                claimsInProcess: [],
                pastClaims: [],
                advanceRequestsInProcess: [],
                pastAdvanceRequests: []
            };
            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel);

            // set default tab to pending
            this._setActiveTab("pending");
        },

        /* ---------- Tab logic ---------- */
        onTabSelect: function (oEvent) {
            var oBtn = oEvent.getSource();
            var sSection = oBtn.data("section") || "";
            if (!sSection) {
                var sId = oBtn.getId();
                if (sId.indexOf("btnPending") !== -1) sSection = "pending";
                else if (sId.indexOf("btnPast") !== -1) sSection = "past";
                else if (sId.indexOf("btnAdvance") !== -1) sSection = "advance";
            }
            if (sSection) this._setActiveTab(sSection);
        },

        _setActiveTab: function (sSection) {
            var oView = this.getView();
            var bPending = (sSection === "pending");
            var bPast = (sSection === "past");
            var bAdvance = (sSection === "advance");

            if (oView.byId("pendingSection")) oView.byId("pendingSection").setVisible(bPending);
            if (oView.byId("pastSection")) oView.byId("pastSection").setVisible(bPast);
            if (oView.byId("advanceSection")) oView.byId("advanceSection").setVisible(bAdvance);

            ["btnPending","btnPast","btnAdvance"].forEach(function(sBtn){
                var oBtn = oView.byId(sBtn);
                if (!oBtn) return;
                if ((sBtn === "btnPending" && bPending) ||
                    (sBtn === "btnPast" && bPast) ||
                    (sBtn === "btnAdvance" && bAdvance)) {
                    oBtn.addStyleClass("tabItemActive");
                } else {
                    oBtn.removeStyleClass("tabItemActive");
                }
            });
        },

        /* ---------- Fragment open (load once) ---------- */
        onAddExpense: function () {
            if (!this._oAddExpenseDialog) {
                Fragment.load({
                    id: this.getView().getId(), // prefix to avoid global ID collisions
                    name: "tvl.mgm.travelmanagement.view.fragments.AddExpense",
                    controller: this
                }).then(function (oDialog) {
                    this._oAddExpenseDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    this._resetExpenseForm(); // blank the form before first open
                    oDialog.open();
                }.bind(this)).catch(function (err) {
                    // defensive logging for loader errors
                    console.error("Fragment load failed:", err);
                    MessageToast.show("Failed to open dialog (see console).");
                });
            } else {
                this._resetExpenseForm();
                this._oAddExpenseDialog.open();
            }
        },

        /* ---------- Reset form & preview (use Fragment.byId with view prefix) ---------- */
        _resetExpenseForm: function () {
            if (!this._oAddExpenseDialog) return;

            var sViewId = this.getView().getId();
            var fn = function(id){ return Fragment.byId(sViewId, id); };

            var oSel = fn("selCategory"); if (oSel && oSel.setSelectedKey) oSel.setSelectedKey("");
            ["inpProject","inpTitle","dpExpenseDate","selCurrency","inpAmount","inpComment"].forEach(function(id){
                var c = fn(id);
                if (!c) return;
                if (c.setValue) c.setValue("");
                if (c.setSelectedKey) c.setSelectedKey("");
            });

            var oImage = fn("imgReceiptPreview");
            var oPdf   = fn("pdfPreview");
            var oText  = fn("txtNoPreview");
            if (oImage) { try { oImage.setSrc(""); oImage.setVisible(false); } catch(e){} }
            if (oPdf)   { try { oPdf.setContent(""); oPdf.setVisible(false); } catch(e){} }
            if (oText)  oText.setVisible(true);

            var oSubmit = fn("btnSubmitClaim"); if (oSubmit) oSubmit.setEnabled(false);

            var oFU = fn("fileUploader"); if (oFU && oFU.setValue) { try { oFU.setValue(""); } catch(e){} }
        },

        /* ---------- FileUploader change handler: preview image or PDF ---------- */
        onFileUploadChange: function (oEvent) {
            var aFiles = oEvent.getParameter("files");
            if (!aFiles || aFiles.length === 0) return;
            var oFile = aFiles[0];

            var reader = new FileReader();
            reader.onload = function (e) {
                var sDataURL = e.target.result;
                var sViewId = this.getView().getId();
                var oImage = Fragment.byId(sViewId, "imgReceiptPreview");
                var oPdf   = Fragment.byId(sViewId, "pdfPreview");
                var oText  = Fragment.byId(sViewId, "txtNoPreview");

                if (oFile.type === "application/pdf") {
                    if (oPdf) {
                        var sEmbed = "<embed type='application/pdf' width='100%' height='450px' src='" + sDataURL + "'/>";
                        oPdf.setContent(sEmbed);
                        oPdf.setVisible(true);
                    }
                    if (oImage) oImage.setVisible(false);
                } else {
                    if (oImage) {
                        oImage.setSrc(sDataURL);
                        oImage.setVisible(true);
                    }
                    if (oPdf) oPdf.setVisible(false);
                }
                if (oText) oText.setVisible(false);
            }.bind(this);

            reader.readAsDataURL(oFile);
        },

        /* ---------- Save (mock) and enable Submit ---------- */
        onSaveExpense: function () {
            var bValid = true;

            // Get input controls
            var oCategory = this.byId("selCategory");
            var oProject = this.byId("inpProject");
            var oTitle = this.byId("inpTitle");
            var oDate = this.byId("dpExpenseDate");
            var oCurrency = this.byId("selCurrency");
            var oAmount = this.byId("inpAmount");
            var oComment = this.byId("inpComment");

            // Reset value states
            [oCategory, oProject, oTitle, oDate, oCurrency, oAmount, oComment].forEach(function (oField) {
                oField.setValueState("None");
            });

            // Validate required fields
            if (!oCategory.getSelectedKey()) { oCategory.setValueState("Error"); bValid = false; }
            if (!oProject.getValue()) { oProject.setValueState("Error"); bValid = false; }
            if (!oTitle.getValue()) { oTitle.setValueState("Error"); bValid = false; }
            if (!oDate.getValue()) { oDate.setValueState("Error"); bValid = false; }
            if (!oCurrency.getSelectedKey()) { oCurrency.setValueState("Error"); bValid = false; }
            if (!oAmount.getValue()) { oAmount.setValueState("Error"); bValid = false; }
            if (!oComment.getValue()) { oComment.setValueState("Error"); bValid = false; }

            if (!bValid) {
                sap.m.MessageToast.show("Please fill all required fields.");
                return;
            }

            // Ensure claims model exists
            var oClaimsModel = this.getOwnerComponent().getModel("claims");
            if (!oClaimsModel) {
                oClaimsModel = new sap.ui.model.json.JSONModel({ claimsInProcess: [] });
                this.getOwnerComponent().setModel(oClaimsModel, "claims");
            }

            // Get current claims array
            var aClaims = oClaimsModel.getProperty("/claimsInProcess") || [];

            // Generate claim number
            var sClaimNumber = "CLR000" + (aClaims.length + 1);

            // Get attachment (image/pdf) if uploaded
            var oFileUploader = this.byId("fileUploader");
            var sAttachment = "";
            var sAttachmentType = "";
            if (oFileUploader && oFileUploader.getValue()) {
                // You may already have a preview stored in your fragment
                var oImage = this.byId("imgReceiptPreview");
                var oPdf = this.byId("pdfPreview");
                if (oImage && oImage.getSrc()) {
                    sAttachment = oImage.getSrc();
                    sAttachmentType = "image";
                } else if (oPdf && oPdf.getContent()) {
                    sAttachment = oPdf.getContent();
                    sAttachmentType = "pdf";
                }
            }

            // Create new claim object
            var oNewClaim = {
                claimNumber: sClaimNumber,
                approvedAmount: 0,
                status: "Pending",
                actionTaken: "NA",
                waitingOn: "Reporting Manager",
                category: oCategory.getSelectedItem().getText(),
                project: oProject.getValue(),
                title: oTitle.getValue(),
                date: oDate.getValue(),
                currency: oCurrency.getSelectedKey(),
                amount: oAmount.getValue(),
                comment: oComment.getValue(),
                attachment: sAttachment,
                attachmentType: sAttachmentType
            };

            // Add to claims array
            aClaims.push(oNewClaim);

            // Update model
            oClaimsModel.setProperty("/claimsInProcess", aClaims);
            oClaimsModel.refresh();

            // Feedback & close dialog
            sap.m.MessageToast.show("Expense submitted with Claim No: " + sClaimNumber);

            if (this._oAddExpenseDialog) this._oAddExpenseDialog.close();
        },
        onSubmitClaim: function () {
            var oView = this.getView();
            var oCompModel = this.getOwnerComponent().getModel("claims");
            var aClaims = oCompModel.getProperty("/claimsInProcess");

            // generate claim number
            var sClaimNumber = "CLR" + ("000" + (aClaims.length + 1)).slice(-4);

            // get form values
            var oCategory = this.byId("selCategory");
            var oProject = this.byId("inpProject");
            var oTitle = this.byId("inpTitle");
            var oDate = this.byId("dpExpenseDate");
            var oCurrency = this.byId("selCurrency");
            var oAmount = this.byId("inpAmount");
            var oComment = this.byId("inpComment");

            // create new claim
            var oNewClaim = {
                claimNumber: sClaimNumber,
                approvedAmount: 0,
                status: "Pending",
                actionTaken: "NA",
                waitingOn: "Reporting Manager",
                category: oCategory.getSelectedItem().getText(),
                project: oProject.getValue(),
                title: oTitle.getValue(),
                date: oDate.getValue(),
                currency: oCurrency.getSelectedKey(),
                amount: oAmount.getValue(),
                comment: oComment.getValue()
            };

            // push to component-level model
            aClaims.push(oNewClaim);
            oCompModel.refresh();

            sap.m.MessageToast.show("Expense submitted with Claim No: " + sClaimNumber);

            if (this._oAddExpenseDialog) this._oAddExpenseDialog.close();
        },

        onCloseExpense: function () {
            if (this._oAddExpenseDialog) this._oAddExpenseDialog.close();
        },

        /* ---------- placeholders for other UI bits ---------- */
        onRequestAdvance: function () { MessageToast.show("Request Advance clicked (placeholder)."); },
        onSearchPastClaims: function () {
            var sFrom = this.byId("dpFromPast") && this.byId("dpFromPast").getValue();
            var sTo = this.byId("dpToPast") && this.byId("dpToPast").getValue();
            MessageToast.show("Search Past Claims: " + sFrom + " - " + sTo);
        },
        onSearchPastAdvances: function () {
            var sFrom = this.byId("dpFromPastAdv") && this.byId("dpFromPastAdv").getValue();
            var sTo = this.byId("dpToPastAdv") && this.byId("dpToPastAdv").getValue();
            MessageToast.show("Search Past Advances: " + sFrom + " - " + sTo);
        },
        onRequestAdvance: function () {
            if (!this._oRequestAdvanceDialog) {
                sap.ui.core.Fragment.load({
                    id: this.getView().getId(),
                    name: "tvl.mgm.travelmanagement.view.fragments.RequestAdvance",
                    controller: this
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    this._oRequestAdvanceDialog = oDialog;
                    oDialog.open();
                }.bind(this));
            } else {
                this._oRequestAdvanceDialog.open();
            }
        },

        onSubmitAdvance: function () {
            // TODO: Add validation like onSaveExpense
            sap.m.MessageToast.show("Advance request submitted successfully");
            if (this._oRequestAdvanceDialog) this._oRequestAdvanceDialog.close();
        },

        onCloseAdvance: function () {
            if (this._oRequestAdvanceDialog) this._oRequestAdvanceDialog.close();
        },
        onOpenManagerInbox: function () {
            this._openLoginDialog("manager");
        },

        onOpenHRInbox: function () {
            this._openLoginDialog("hr");
        },

        _openLoginDialog: function (sType) {
            var that = this;
            if (!this._oLoginDialog) {
                this._oLoginDialog = new sap.m.Dialog({
                    title: "Login",
                    content: [
                        new sap.m.Input("inpEmail", { placeholder: "Email" }),
                        new sap.m.Input("inpPwd", { placeholder: "Password", type: "Password" })
                    ],
                    beginButton: new sap.m.Button({
                        text: "Login",
                        press: function () {
                            that._oLoginDialog.close();
                            var oNav = that.byId("navContainer");
                            if (sType === "manager") {
                                oNav.to(that.byId("managerPage"));
                            } else {
                                oNav.to(that.byId("hrPage"));
                            }
                        }
                    }),
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        press: function () { that._oLoginDialog.close(); }
                    })
                });
            }
            this._oLoginDialog.open();
        },

        onBackToMain: function () {
            var oNav = this.byId("navContainer");
            oNav.to(this.byId("mainPage"));
        },
        // Open claim details fragment
        

        _fillClaimDetails: function (oData) {
            var sViewId = this.getView().getId();

            this.byId("txtClaimNumber").setText(oData.claimNumber);
            this.byId("txtCategory").setText(oData.category);
            this.byId("txtProject").setText(oData.project);
            this.byId("txtTitle").setText(oData.title);
            this.byId("txtDate").setText(oData.date);
            this.byId("txtCurrency").setText(oData.currency);
            this.byId("txtAmount").setText(oData.amount);
            this.byId("txtComment").setText(oData.comment);
            this.byId("txtApprovedAmount").setText(oData.approvedAmount);
            this.byId("txtStatus").setText(oData.status);
            this.byId("txtActionTaken").setText(oData.actionTaken);
            this.byId("txtWaitingOn").setText(oData.waitingOn);

            // Attachment preview
            var oImage = this.byId("imgReceiptPreview");
            var oPdf = this.byId("pdfPreview");
            var oText = this.byId("txtNoPreview");

            if (oData.attachmentType === "pdf") {
                if (oPdf) {
                    oPdf.setContent("<embed type='application/pdf' width='100%' height='450px' src='" + oData.attachment + "'/>");
                    oPdf.setVisible(true);
                }
                if (oImage) oImage.setVisible(false);
                if (oText) oText.setVisible(false);
            } else if (oData.attachmentType === "image") {
                if (oImage) {
                    oImage.setSrc(oData.attachment);
                    oImage.setVisible(true);
                }
                if (oPdf) oPdf.setVisible(false);
                if (oText) oText.setVisible(false);
            } else {
                if (oText) oText.setVisible(true);
                if (oImage) oImage.setVisible(false);
                if (oPdf) oPdf.setVisible(false);
            }
        },
        // Open Claim Details dialog (read-only for manager/HR)
// Open Claim Details dialog from manager/HR inbox
        onViewClaimDetails: function (oEvent) {
            var oClaim = oEvent.getSource().getBindingContext("claims").getObject();
            this._openClaimDetailsDialog(oClaim);
        },

        _openClaimDetailsDialog: function (oClaim) {
            var that = this;
            var sViewId = this.getView().getId(); // prefix to avoid duplicate IDs

            if (!this._oClaimDetailsDialog) {
                sap.ui.core.Fragment.load({
                    id: sViewId + "-claimDetails", // unique prefix
                    name: "tvl.mgm.travelmanagement.view.fragments.ClaimDetails",
                    controller: this
                }).then(function (oDialog) {
                    that._oClaimDetailsDialog = oDialog;
                    that.getView().addDependent(oDialog);
                    that._populateClaimDetails(oClaim);
                    oDialog.open();
                });
            } else {
                this._populateClaimDetails(oClaim);
                this._oClaimDetailsDialog.open();
            }
        },

        _populateClaimDetails: function (oClaim) {
            var sViewId = this.getView().getId();
            var fn = id => sap.ui.core.Fragment.byId(sViewId + "-claimDetails", id);

            // Fill claim details
            fn("txtClaimNumber").setText(oClaim.claimNumber);
            fn("txtCategory").setText(oClaim.category);
            fn("txtProject").setText(oClaim.project);
            fn("txtTitle").setText(oClaim.title);
            fn("txtDate").setText(oClaim.date);
            fn("txtCurrency").setText(oClaim.currency);
            fn("txtAmount").setText(oClaim.amount);
            fn("txtComment").setText(oClaim.comment);
            fn("txtApprovedAmount").setText(oClaim.approvedAmount);
            fn("txtStatus").setText(oClaim.status);
            fn("txtActionTaken").setText(oClaim.actionTaken);
            fn("txtWaitingOn").setText(oClaim.waitingOn);

            // Attachment preview
            var oImage = fn("imgReceiptPreview");
            var oPdf = fn("pdfPreview");
            var oText = fn("txtNoPreview");

            if (oClaim.attachment) {
                if (oClaim.attachmentType === "pdf") {
                    var sHtml = "<embed src='" + encodeURI(oClaim.attachment) +
                        "' type='application/pdf' width='100%' height='500px'/>";
                    oPdf.setContent(sHtml);
                    oPdf.setVisible(true);
                    oImage.setVisible(false);
                    oText.setVisible(false);
                } else if (oClaim.attachmentType === "image") {
                    oImage.setSrc(oClaim.attachment);
                    oImage.setVisible(true);
                    oPdf.setVisible(false);
                    oText.setVisible(false);
                } else {
                    oImage.setVisible(false);
                    oPdf.setVisible(false);
                    oText.setVisible(true);
                }
            } else {
                oImage.setVisible(false);
                oPdf.setVisible(false);
                oText.setVisible(true);
            }
        },
        onCloseClaimDetails: function () {
            if (this._oClaimDetailsDialog) this._oClaimDetailsDialog.close();
        }
    });
});
