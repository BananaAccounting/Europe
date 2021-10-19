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
// @id = ch.banana.fr.app.fecfileimport.js
// @api = 1.0
// @pubdate = 2021-10-19
// @publisher = Banana.ch SA
// @description = Importation de fichiers d'enregistrements comptables (FEC) 
// @description.fr = Importation de fichiers d'enregistrements comptables (FEC)
// @doctype = *
// @encoding = utf-8
// @task = import.file
// @inputencoding = utf-8
// @inputfilefilter = Text files (*.txt *.csv);;All files (*.*)

/*
*   SUMMARY
*
*   Import the accounts taken from the txt file.
*   Accounts that already exist are not imported.
*
*   For the "BClass" we followed the accounting plan schema on page: https://fr.wikipedia.org/wiki/Plan_comptable_g%C3%A9n%C3%A9ral_(France)
*   
*   BClass 1: Assets        => accounts: 2xxxx, 3xxxx, 5xxxx
*   BClass 2: Liabilities   => accounts: 1xxxx, 4xxxx
*   BClass 3: Expenses      => accounts: 6xxxx
*   BClass 4: Income        => accounts: 7xxxx
*
*   1   2   3   4   5   6   7
*   P   A   A   P   A   C   R
*
*   For the "Gr" we take the first two digits of the account number.
*
*/

/**
 * function called from converter
 */
 function setup() {}

 var FrAuditFilesImport = class FrAuditFilesImport {
    constructor(banDocument) {
        this.version = '1.0';
        this.isAdvanced = true; //this.isBananaAdvanced();
        this.banDocument = banDocument;
        this.gr="";
        this.bClass="";

        //array dei patches
        this.jsonDocArray = [];

        //errors
        this.ID_ERR_LICENSE_NOTVALID = "ID_ERR_LICENSE_NOTVALID";
        this.ID_ERR_VERSION_NOTSUPPORTED = "ID_ERR_VERSION_NOTSUPPORTED";

    }

    /**
     * Il metodo createJsonDocument() riprende i dati dal file xml e li trasforma
     * in formato json per essere importati nella tabella Registrazioni
     * @param {*} inData 
     */
    createJsonDocument(inData) {

        var jsonDoc = this.createJsonDocument_Init();
        var lang = this.getLang();


        //create Accounts
        this.createJsonDocument_AddAccounts(jsonDoc,inData);

        this.jsonDocArray.push(jsonDoc);

    }

    createJsonDocument_AddAccounts(jsonDoc,inData){

        var rows = [];
        var transactionsRows=inData;

        var accounts=this.getAccountsList(transactionsRows);

        for (var i = 0; i < accounts.length; i++) {
            
            var accountNumber="";
            var accountDescription="";
            var bclass="";
            var gr="";

            accountNumber=accounts[i].split('&$&')[0]; // i.e. "1000&$&Cash" => "1000"
            accountDescription = accounts[i].split('&$&')[1]; // i.e. "1000&$&Cash" => "Cash"
            bclass = this.setBclassByAccount(accountNumber);
            gr = this.setGrByAccount(accountNumber, 2);

            if(this.gr!=gr){//RIPRENDERE DALLA SISTEMAZIONE DEI RAGGRUPPAMENTI
                var grRows = this.getGroupRow(this.lead.code, accType);
                rows.push(grRows.row);
                rows.push(grRows.emptyRow);
            }




            var row = {};
            row.operation = {};
            row.operation.name = "add";
            row.fields = {};
            row.fields["Account"] = accountNumber;
            row.fields["Description"] = accountDescription;
            row.fields["BClass"] = bclass;
            row.fields["Gr"] = gr;

            rows.push(row);

            this.bClass=bClass;
            this.gr

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
        grRows.row = {};
        grRows.row.operation = {};
        grRows.row.operation.name = "add";
        grRows.row.fields = {};
        grRows.row.fields["Group"] = grCode;
        grRows.row.fields["Description"] = this.lead.description;
        grRows.row.fields["Gr"] = this.getGroupTotal(this.bClass, accType);
        grRows.emptyRow = this.getEmptyRow();

        return grRows;
    }

    getSectionRow(currentAccType, previsousAccType) {
        var secRows = {};
        secRows.row = {};
        secRows.row.operation = {};
        secRows.row.operation.name = "add";
        secRows.row.fields = {};
        secRows.row.fields["Group"] = this.getGroupTotal(this.bClass, currentAccType);
        secRows.row.fields["Description"] = this.getSectionDescription(this.bClass, currentAccType);
        secRows.row.fields["Gr"] = this.getSectionGr(previsousAccType);
        //create an empty row to append after the total row
        secRows.emptyRow = this.getEmptyRow();
        return secRows;
    }

    getAccountsList(transactionsRows){
        var accountsList=[];
        for (var trRow in transactionsRows){
            var fileRow=transactionsRows[trRow];
                if (fileRow["CompteNum"] && fileRow["CompteLib"]) {
                    accountsList.push(fileRow["CompteNum"]+"&$&"+fileRow["CompteLib"]);
                }
        }
        // Removing duplicates
        for (var i = 0; i < accountsList.length; i++) {
            for (var x = i+1; x < accountsList.length; x++) {
                if (accountsList[x] === accountsList[i]) {
                    accountsList.splice(x,1);
                    --x;
                }
            }
        }

        accountsList.sort();
        //Banana.console.log(accountsList);
        return accountsList;
    }

    setGrByAccount(account, digits) {
        var gr = account.substring(0,digits);
        return gr;
    }

    setBclassByAccount(account) {
        var bclass = "";
        var firstDigit = account.substring(0,1);
    
        if (firstDigit == "1") { // Liabilities: Gr=10
            bclass = "2"
        }
        else if (firstDigit == "2") { // Assets: Gr=20
            bclass = "1";
        }
        else if (firstDigit == "3") { // Assets: Gr=30
            bclass = "1";
        }
        else if (firstDigit == "4") { // Liabilities: Gr=40
            bclass = "2";
        }
        else if (firstDigit == "5") { // Assets: Gr=50
            bclass = "1";
        }
        else if (firstDigit == "6") { // Expenses: Gr=60
            bclass = "3";
        }
        else if (firstDigit == "7") { // Revenue: Gr=70
            bclass = "4";
        }
        else {
            bclass = "";
        }
        //Banana.console.log(bclass);
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

/**
 * The function findSeparator is used to find the field separator.
 */
 function findSeparator(string) {

    var commaCount=0;
    var semicolonCount=0;
    var tabCount=0;
 
    for(var i = 0; i < 1000 && i < string.length; i++) {
       var c = string[i];
       if (c === ',')
          commaCount++;
       else if (c === ';')
          semicolonCount++;
       else if (c === '\t')
          tabCount++;
    }
 
    if (tabCount > commaCount && tabCount > semicolonCount)
    {
       return '\t';
    }
    else if (semicolonCount > commaCount)
    {
       return ';';
    }
 
    return ',';
}

// Main function
function exec(inData) {

    //Get the txt file and convert to array
    var fieldSeparator = findSeparator(inData);
    var transactions = Banana.Converter.csvToArray(inData, fieldSeparator, '"');
    var transactions_header=transactions[0];
    transactions.splice(0,1);
    var transactionsObjs=Banana.Converter.arrayToObject(transactions_header,transactions,true);


    var frAuditFilesImport = new FrAuditFilesImport(Banana.document);
    if (!frAuditFilesImport.verifyBananaVersion()) {
        return "@Cancel";
    }

    frAuditFilesImport.createJsonDocument(transactionsObjs);

    var jsonDoc = { "format": "documentChange", "error": "" };
    jsonDoc["data"] = frAuditFilesImport.jsonDocArray;

    return jsonDoc;
}