// Copyright [2018] [Banana.ch SA - Lugano Switzerland]
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// @id = ch.banana.no.app.auditfileimport.js
// @api = 1.0
// @pubdate = 2021-10-11
// @publisher = Banana.ch SA
// @description = Norway Import Audit File (BETA)
// @doctype = *
// @encoding = utf-8
// @task = import.file
// @outputformat = tablewithheaders
// @inputdatasource = openfiledialog
// @inputencoding = utf-8
// @inputfilefilter = XML files (*.xml);;All files (*.*)


//called from converter
function setup() {

}

var NoAuditFilesImport = class NoAuditFilesImport {
        constructor(banDocument) {
            this.version = '1.0';
            this.isAdvanced = this.isBananaAdvanced();
            this.banDocument = banDocument;
            this.jsonDocArray = [];
            this.gr = "";
            this.bClass = "";

            //errors
            this.ID_ERR_LICENSE_NOTVALID = "ID_ERR_LICENSE_NOTVALID";
            this.ID_ERR_VERSION_NOTSUPPORTED = "ID_ERR_VERSION_NOTSUPPORTED";

        }

        /**
         * creates the json document.
         * @param {*} inData imported file
         */
        createJsonDocument(inData) {

            var jsonDoc = this.createJsonDocument_Init();
            var lang = this.getLang();

            for (var srcFileName in inData) {

                //seleziona singolo file xml
                var xmlFile = Banana.Xml.parse(inData[srcFileName]);
                if (!xmlFile)
                    continue;

                var xmlRoot = xmlFile.firstChildElement('n1:AuditFile');
                if (!xmlRoot)
                    continue;

                if (xmlRoot.hasChildElements('n1:Header'))
                    var headerNode = xmlRoot.firstChildElement('n1:Header');
                if (xmlRoot.hasChildElements('n1:Company'))
                    var companyNode = headerNode.firstChildElement('n1:Company');
                if (xmlRoot.hasChildElements('n1:MasterFiles'))
                    var masterFilesNode = xmlRoot.firstChildElement('n1:MasterFiles');

                /*********************************************************************
                 * ADD THE FILE PROPERTIES
                 *********************************************************************/
                this.createJsonDocument_AddFileProperties(jsonDoc, srcFileName, headerNode, companyNode);
                /*********************************************************************
                 * ADD THE ACCOUNTS
                 *********************************************************************/
                this.createJsonDocument_AddAccounts(jsonDoc, srcFileName, masterFilesNode);

                /*********************************************************************
                 * ADD THE COSTUMERS/SUPPLIERS
                 *********************************************************************/
                /* if (customersSuppliersList.length > 0)
                     this.createJsonDocument_AddCostumersSuppliers(jsonDoc, srcFileName, customerSupplierNode, customersSuppliersList);*/

                /*********************************************************************
                 * ADD THE TRANSACTIONS
                 *********************************************************************/
                //this.createJsonDocument_AddTransactions(jsonDoc, xmlRoot, companyNode, srcFileName);
                // se non è la versione, avverto che l'importazione delle registrazioni è limitata a 100 righe
                //Banana.console.debug("is Advanced: "+this.isAdvanced);
                /*if (!this.isAdvanced) {
                    var msg = this.getErrorMessage(this.ID_ERR_LICENSE_NOTVALID, lang);
                    this.banDocument.addMessage(msg, this.ID_ERR_LICENSE_NOTVALID);
                }*/

                /*********************************************************************
                 * ADD THE SUBLEDGERS ELEMENTS
                 *********************************************************************/
                //add the vat codes, solo se è presente la tabella vat
                /*var table = this.banDocument.table("VatCodes");
                if (table)
                    this.createJsonDocument_AddVatCodes(jsonDoc, srcFileName, companyNode);*/

            }

            this.jsonDocArray.push(jsonDoc);

        }
        createJsonDocument_AddFileProperties(jsonDoc, srcFileName, headerNode) {

            var rows = [];

            var fileInfoFields = this.getFileInfoFields();
            var companyInfos = this.getCompanyInfo(headerNode);

            for (var i = 0; i < fileInfoFields.length; i++) {
                var sectionXml = "";
                if (i <= 1)
                    sectionXml = "Base";
                else
                    sectionXml = "AccountingDataBase";

                var row = {};
                row.operation = {};
                row.operation.name = "modify";
                row.operation.srcFileName = srcFileName;
                row.fields = {};
                row.fields["SectionXml"] = sectionXml;
                row.fields["IdXml"] = fileInfoFields[i];
                row.fields["ValueXml"] = companyInfos[i];

                rows.push(row);
            }

            var dataUnitFilePorperties = {};
            dataUnitFilePorperties.nameXml = "FileInfo";
            dataUnitFilePorperties.data = {};
            dataUnitFilePorperties.data.rowLists = [];
            dataUnitFilePorperties.data.rowLists.push({ "rows": rows });

            jsonDoc.document.dataUnits.push(dataUnitFilePorperties);


        }

        /**
         * 
         * @param {*} companyNode the xml company node
         * @returns the values i want to put in the file properties fields
         */
        getCompanyInfo(headerNode) {

            var companyInfos = [];
            var startDate = "";
            var startDatePeriod = "";
            var startDateYear = "";
            var endDate = "";
            var endDateYear = ""
            var endDatePeriod = "";
            var basicCurrency = "";

            var streetAddressNode = "";
            var postalCode = "";
            var companyName = "";
            var companyIdentification = "";
            var companyStreetName = "";
            var companyStreetAddressCity = "";
            var companyStreetAddressRegion = "";
            var companyStreetAddressCountry = "";
            var companyStreetAddressTaxReg = "";


            //take the information from the node: SelectionCriteria
            if (headerNode.hasChildElements('n1:SelectionCriteria')) {
                var SelectionCriteriaNode = headerNode.firstChildElement('n1:SelectionCriteria');
                //find period start date
                startDateYear = SelectionCriteriaNode.firstChildElement('n1:PeriodStartYear').text;
                startDatePeriod += SelectionCriteriaNode.firstChildElement('n1:PeriodStart').text;
                startDatePeriod--; //because js months are from 0 to 11.
                startDate = new Date(startDateYear, startDatePeriod, 1);
                Banana.Converter.toInternalDateFormat.debug(startDate);

                //find period end date
                endDateYear = SelectionCriteriaNode.firstChildElement('n1:PeriodEndYear').text;
                endDatePeriod += SelectionCriteriaNode.firstChildElement('n1:PeriodEnd').text;
                endDatePeriod--;
                endDatePeriod = new Date(endDateYear, endDatePeriod, 31);
                Banana.Converter.toInternalDateFormat.debug(endDatePeriod);
            }

            basicCurrency = headerNode.firstChildElement('n1:DefaultCurrencyCode').text;


            //take the information from node: company
            if (headerNode.hasChildElements("n1:Company"))
                var companyNode = headerNode.firstChildElement("n1:Company")
            companyName = companyNode.firstChildElement('n1:Name').text;
            if (companyNode.hasChildElements('n1:RegistrationNumber'))
                companyIdentification = companyNode.firstChildElement('n1:RegistrationNumber').text;
            //address
            if (companyNode.hasChildElements('n1:Address'))
                streetAddressNode = companyNode.firstChildElement('n1:Address')
            companyStreetName = streetAddressNode.firstChildElement('n1:StreetName').text;
            if (streetAddressNode.hasChildElements('n1:PostalCode'))
                postalCode = streetAddressNode.firstChildElement('n1:PostalCode');
            if (streetAddressNode.hasChildElements('n1:City'))
                companyStreetAddressCity = streetAddressNode.firstChildElement('n1:City').text;
            if (streetAddressNode.hasChildElements('n1:Region'))
                companyStreetAddressRegion = streetAddressNode.firstChildElement('n1:Region').text;
            if (streetAddressNode.hasChildElements('n1:Country'))
                companyStreetAddressCountry = streetAddressNode.firstChildElement('n1:Country').text;
            if (companyNode.hasChildElements('taxRegIdent'))
                companyStreetAddressTaxReg = companyNode.firstChildElement('taxRegIdent').text;



            companyInfos[0] = companyName + " " + companyIdentification;
            companyInfos[1] = companyStreetName + ", " + companyStreetAddressCity + "," + postalCode + ", " + companyStreetAddressRegion;
            companyInfos[2] = startDate;
            companyInfos[3] = endDate;
            companyInfos[4] = basicCurrency;
            companyInfos[5] = companyName;
            companyInfos[6] = companyStreetName;
            companyInfos[7] = companyStreetAddressCity;
            companyInfos[8] = companyStreetAddressRegion;
            companyInfos[9] = companyStreetAddressCountry;
            companyInfos[10] = companyStreetAddressTaxReg;


            return companyInfos;
        }

        /**
         * 
         * @returns the list of the file properties fields i want to modify/add
         */
        getFileInfoFields() {
            var propertyFields = [];

            propertyFields[0] = "HeaderLeft";
            propertyFields[1] = "HeaderRight";
            propertyFields[2] = "OpeningDate";
            propertyFields[3] = "ClosureDate";
            propertyFields[4] = "BasicCurrency";
            propertyFields[5] = "Company";
            propertyFields[6] = "Address1";
            propertyFields[7] = "City";
            propertyFields[8] = "State";
            propertyFields[9] = "CountryCode";
            propertyFields[10] = "FiscalNumber";


            return propertyFields;

        }

        /**
         * returns the accounts to add
         * @param {*} jsonDoc 
         * @param {*} srcFileName 
         * @param {*} masterFilesNode 
         * @returns 
         */
        createJsonDocument_AddAccounts(jsonDoc, srcFileName, masterFilesNode) {

            if (!masterFilesNode)
                return "";

            var rows = [];
            var GeneralLedgerAccountsNode = ""
            var accountNode = "";

            GeneralLedgerAccountsNode = masterFilesNode.firstChildElement('n1:GeneralLedgerAccounts');
            accountNode = GeneralLedgerAccountsNode.firstChildElement('n1:Account');

            while (accountNode) {

                var accountNumber = "";
                var accountDescription = "";
                var accType = "";
                var gr = "";
                var bclass = "";
                var totalGr = "";
                var opening = "";
                var grDescription = "";

                accountNumber = accountNode.firstChildElement('n1:AccountID').text;

                if (accountNode.hasChildElements('n1:AccountDescription'))
                    accountDescription = accountNode.firstChildElement('n1:AccountDescription').text;

                if (accountNode.hasChildElements('n1:StandardAccountID'))
                    gr = accountNode.firstChildElement('n1:StandardAccountID').text;
                else
                    gr = this.setGrByAccount(accountNumber);

                if (accountNode.hasChildElements('n1:AccountType'))
                    accType = accountNode.firstChildElement('n1:AccountType').text;

                bclass = this.setBClassByAccount(accountNumber);

                if (accountNode.hasChildElements('n1:OpeningDebitBalance'))
                    opening = accountNode.firstChildElement('n1:OpeningDebitBalance').text;


                if (this.gr != gr) {
                    var grRows = this.getGroupRow(this.gr, accType);
                    rows.push(grRows.row);
                    rows.push(grRows.emptyRow);
                }


                var row = {};
                row.operation = {};
                row.operation.name = "add";
                row.operation.srcFileName = srcFileName;
                row.fields = {};
                row.fields["Account"] = accountNumber;
                row.fields["Description"] = accountDescription;
                row.fields["BClass"] = bclass;
                row.fields["Gr"] = gr;
                row.fields["Opening"] = opening;


                rows.push(row);

                this.gr = gr;


                accountNode = accountNode.nextSiblingElement('n1:Account');
            }


            var dataUnitFilePorperties = {};
            dataUnitFilePorperties.nameXml = "Accounts";
            dataUnitFilePorperties.data = {};
            dataUnitFilePorperties.data.rowLists = [];
            dataUnitFilePorperties.data.rowLists.push({ "rows": rows });

            // Banana.Ui.showText(JSON.stringify(dataUnitFilePorperties));

            jsonDoc.document.dataUnits.push(dataUnitFilePorperties);


        }

        getGroupRow(grCode, accType) {
            var grRows = {};
            if (!grCode)
                return grRows;
            grRows.row = {};
            grRows.row.operation = {};
            grRows.row.operation.name = "add";
            grRows.row.fields = {};
            grRows.row.fields["Group"] = grCode;
            grRows.row.fields["Description"] = "Gr description";
            grRows.row.fields["Gr"] = "1";
            grRows.emptyRow = this.getEmptyRow();

            return grRows;
        }

        getEmptyRow() {
            var emptyRow = {};
            emptyRow.operation = {};
            emptyRow.operation.name = "add";
            emptyRow.fields = {};

            return emptyRow;
        }

        getGroupTotal(bclass, accType) {
            var groupTotal = "";
            switch (bclass) {
                case "1":
                    groupTotal = "1I"
                    return groupTotal;
                case "2":
                    groupTotal = "2E"
                    return groupTotal;
                case "3":
                    groupTotal = "3G"
                    return groupTotal;
                case "4":
                    groupTotal = "4D"
                    return groupTotal;
                default:
                    return groupTotal;
            }
        }

        // Return the BClass for the given account
        setBClassByAccount(account) {

            /*  
                Groups:
                1 Assets
                2 Equity and liabilities
                3 Sales and Operating income
                4 Cost of goods
                5 Labor costs
                6 and 7 Other operating expenses, write-downs
                8 Financial income and cost, extra words. Income and cost
            */

            var bclass = "";
            if (account.substring(0, 1) === "1") {
                bclass = "1";
            } else if (account.substring(0, 1) === "2") {
                bclass = "2";
            } else if (account.substring(0, 1) === "3") {
                bclass = "4";
            } else if (account.substring(0, 1) === "4" || account.substring(0, 1) === "5" || account.substring(0, 1) === "6" || account.substring(0, 1) === "7") {
                bclass = "3";
            } else if (account.substring(0, 1) === "8") {
                //bclass 3 or 4
                bclass = "";
            }
            return bclass;
        }

        createJsonDocument_Init() {

            var jsonDoc = {};
            jsonDoc.document = {};
            jsonDoc.document.dataUnitsfileVersion = "1.0.0";
            jsonDoc.document.dataUnits = [];

            jsonDoc.creator = {};
            var d = new Date();
            var datestring = d.getFullYear() + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
            var timestring = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
            jsonDoc.creator.executionDate = Banana.Converter.toInternalDateFormat(datestring, "yyyymmdd");
            jsonDoc.creator.executionTime = Banana.Converter.toInternalTimeFormat(timestring, "hh:mm");
            jsonDoc.creator.name = Banana.script.getParamValue('id');
            jsonDoc.creator.version = "1.0";

            return jsonDoc;

        }

        getAccountingInfo() {
            this.accountingInfo = {};
            this.accountingInfo.isDoubleEntry = false;
            this.accountingInfo.isIncomeExpenses = false;
            this.accountingInfo.isCashBook = false;
            this.accountingInfo.multiCurrency = false;
            this.accountingInfo.withVat = false;
            this.accountingInfo.vatAccount = "";
            this.accountingInfo.customersGroup = "";
            this.accountingInfo.suppliersGroup = "";

            if (this.banDocument) {
                var fileGroup = this.banDocument.info("Base", "FileTypeGroup");
                var fileNumber = this.banDocument.info("Base", "FileTypeNumber");
                var fileVersion = this.banDocument.info("Base", "FileTypeVersion");

                if (fileGroup == "100")
                    this.accountingInfo.isDoubleEntry = true;
                else if (fileGroup == "110")
                    this.accountingInfo.isIncomeExpenses = true;
                else if (fileGroup == "130")
                    this.accountingInfo.isCashBook = true;

                if (fileNumber == "110") {
                    this.accountingInfo.withVat = true;
                }
                if (fileNumber == "120") {
                    this.accountingInfo.multiCurrency = true;
                }
                if (fileNumber == "130") {
                    this.accountingInfo.multiCurrency = true;
                    this.accountingInfo.withVat = true;
                }

                if (this.banDocument.info("AccountingDataBase", "VatAccount"))
                    this.accountingInfo.vatAccount = this.banDocument.info("AccountingDataBase", "VatAccount");

                if (this.banDocument.info("AccountingDataBase", "CustomersGroup"))
                    this.accountingInfo.customersGroup = this.banDocument.info("AccountingDataBase", "CustomersGroup");
                if (this.banDocument.info("AccountingDataBase", "SuppliersGroup"))
                    this.accountingInfo.suppliersGroup = this.banDocument.info("AccountingDataBase", "SuppliersGroup");
            }
        }

        getErrorMessage(errorId, lang) {
            if (!lang)
                lang = 'en';
            switch (errorId) {
                case this.ID_ERR_LICENSE_NOTVALID:
                    // Banana.console.debug("advanced message: "+errorId);
                    return "This extension requires Banana Accounting+ Advanced, the import of Transactions is limited to 100 Rows";
                case this.ID_ERR_VERSION_NOTSUPPORTED:
                    return "This script does not run with your current version of Banana Accounting.\nMinimum version required: %1.\nTo update or for more information click on Help";
                default:
                    return '';
            }
        }

        isBananaAdvanced() {
            // Starting from version 10.0.7 it is possible to read the property Banana.application.license.isWithinMaxRowLimits 
            // to check if all application functionalities are permitted
            // the version Advanced returns isWithinMaxRowLimits always false
            // other versions return isWithinMaxRowLimits true if the limit of transactions number has not been reached

            if (Banana.compareVersion && Banana.compareVersion(Banana.application.version, "10.0.9") >= 0) {
                var license = Banana.application.license;
                //Banana.console.debug(license.licenseType);
                //tolgo il license.isWithinMaxFreeLines perchè siccome il file inizialmente e vuoto mi darà sempre true.
                if (license.licenseType === "advanced") {
                    return true;
                }
            }
            return false;
        }

        verifyBananaVersion() {
            if (!Banana.document)
                return false;

            var lang = this.getLang();

            //Banana+ is required
            var requiredVersion = "10.0.9";
            if (Banana.compareVersion && Banana.compareVersion(Banana.application.version, requiredVersion) < 0) {
                var msg = this.getErrorMessage(this.ID_ERR_VERSION_NOTSUPPORTED, lang);
                msg = msg.replace("%1", requiredVersion);
                this.banDocument.addMessage(msg, this.ID_ERR_VERSION_NOTSUPPORTED);
                return false;
            }
            return true;
        }

        getLang() {
            var lang = 'en';
            if (this.banDocument)
                lang = this.banDocument.locale;
            else if (Banana.application.locale)
                lang = Banana.application.locale;
            if (lang.length > 2)
                lang = lang.substr(0, 2);
            return lang;
        }
    }
    // Return the group (Gr) for the given account
function setGrByAccount(account) {
    var gr = "";
    //....
    return gr;
}

function exec(inData) {

    if (!Banana.document || inData.length <= 0) {
        return "@Cancel";
    }

    Banana.application.clearMessages();
    var noAuditFilesImport = new NoAuditFilesImport(Banana.document);
    if (!noAuditFilesImport.verifyBananaVersion()) {
        return "@Cancel";
    }

    var jsonData = {};
    try {
        jsonData = JSON.parse(inData);
    } catch (e) {
        jsonData[0] = inData;
    }

    if (!jsonData)
        return "@Cancel";

    noAuditFilesImport.createJsonDocument(jsonData);

    var jsonDoc = { "format": "documentChange", "error": "" };
    jsonDoc["data"] = noAuditFilesImport.jsonDocArray;

    return jsonDoc;
}