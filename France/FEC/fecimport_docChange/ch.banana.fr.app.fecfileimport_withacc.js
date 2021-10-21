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


/*****************************************************************************************************
 * THIS VERSION PLANS TO START FROM A FILE WITH THE CHART OF ACCOUNTS ALREADY SETUP
 *****************************************************************************************************/

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


        //import Accounts
        this.createJsonDocument_AddAccounts(jsonDoc,inData);
        //import Transactions
        this.createJsonDocument_AddTransactions(jsonDoc,inData);
        //Company Info's-->Not available in this kind of file

        this.jsonDocArray.push(jsonDoc);

    }

    createJsonDocument_AddTransactions(jsonDoc,inData){

        var rows = [];
        var jContraAccountGroup = [];
        var transactionsRows=inData;
        jContraAccountGroup = this.getJContraAccounGroups(transactionsRows);

        var transactions = [];
        for (var i = 0; i < jContraAccountGroup.length; i++) {
            transactions.push(this.getByValue(transactionsRows, jContraAccountGroup[i]));
        }

        for (var i = 0; i < transactions.length; i++) {
            var date = "";
            var description = "";
            var accountDebit = "";
            var accountCredit = "";
            var debitAmount = "";
            var creditAmount = "";
            var amount = "";

            var checkDebitAmount = "";
            var checkCreditAmount = "";

            //The transaction is on more then 2 lines: 3+ rows from the journal
            if (transactions[i].length > 2) {
                for (var j = 0; j < transactions[i].length; j++) {
                    date = this.formatDate(transactions[i][j][3]);
                    description = transactions[i][j][10];
                    //il montante è a debito 
                    if (transactions[i][j][4] && transactions[i][j][11]) {
                        accountDebit = transactions[i][j][4];
                        accountCredit = "";
                        debitAmount = transactions[i][j][11];

                        //create and add the transaction line
                        var row=this.getTransactionRow(date,description,accountDebit,accountCredit,debitAmount);
                        rows.push(row);

                        checkDebitAmount = Banana.SDecimal.add(checkDebitAmount, debitAmount);
                        //il montante è a credito 
                    } else if (transactions[i][j][4] && transactions[i][j][12]) {
                        accountDebit = "";
                        accountCredit = transactions[i][j][4];
                        creditAmount = transactions[i][j][12];

                        //create and add the transaction line
                        var row=this.getTransactionRow(date,description,accountDebit,accountCredit,creditAmount);
                        rows.push(row);

                        checkCreditAmount = Banana.SDecimal.add(checkCreditAmount, creditAmount);
                    }
                }

                if (checkDebitAmount !== checkCreditAmount) {
                    Banana.document.addMessage("Debit amount != Credit amount!!!");
                }

            }        
            //The transaction is on one line: 2 rows from the journal
            else {
                for (var j = 0; j < transactions[i].length; j++) {
                    var date = this.formatDate(transactions[i][j][3]);
                    var description = transactions[i][j][10];
                    if (transactions[i][j][4] && transactions[i][j][11]) {
                        var accountDebit = transactions[i][j][4];
                        var debitAmount = Banana.SDecimal.add(debitAmount, transactions[i][j][11]);
                    } else if (transactions[i][j][4] && transactions[i][j][12]) {
                        var accountCredit = transactions[i][j][4];
                        var creditAmount = Banana.SDecimal.add(creditAmount, transactions[i][j][12]);
                    }
                }

                    //create and add the transaction line
                    var row=this.getTransactionRow(date,description,accountDebit,accountCredit,debitAmount);
                    rows.push(row);
    
                if (debitAmount !== creditAmount) {
                    Banana.document.addMessage("Debit amount != Credit amount!!!");
                }
            }

        }

        var dataUnitFilePorperties = {};
        dataUnitFilePorperties.nameXml = "Transactions";
        dataUnitFilePorperties.data = {};
        dataUnitFilePorperties.data.rowLists = [];
        dataUnitFilePorperties.data.rowLists.push({ "rows": rows });

        jsonDoc.document.dataUnits.push(dataUnitFilePorperties);


    }

    createJsonDocument_AddAccounts(jsonDoc,inData){

        var rows = [];
        var transactionsRows=inData;

        var accounts=this.getAccountsList(transactionsRows);

        for (var i = 0; i < accounts.length; i++) {
            
            var accountNumber="";
            var accountDescription="";
            var bClass="";
            var gr="";
            var accountAlreadyExistent=false;

            accountNumber=accounts[i].split('&$&')[0]; // i.e. "1000&$&Cash" => "1000"
            accountDescription = accounts[i].split('&$&')[1]; // i.e. "1000&$&Cash" => "Cash"
            bClass = this.setBclassByAccount(accountNumber);
            gr = this.setGrByAccount(accountNumber, 2);


            //check if account already exists
            var existingAccounts=this.getAccountsTableRow();
            //check if exists
            accountAlreadyExistent=this.checkIfAccountExists(existingAccounts,accountNumber,accountAlreadyExistent);

            if(!accountAlreadyExistent){

                var accountIndex=this.getNewAccountIndex(existingAccounts,accountNumber);

                var row = {};
                row.operation = {};
                row.operation.name = "add";
                row.operation.sequence=accountIndex;
                row.fields = {};
                row.fields["Account"] = accountNumber;
                row.fields["Description"] = accountDescription;
                row.fields["BClass"] = bClass;
                row.fields["Gr"] = gr;

                rows.push(row);
            }

        }

        var dataUnitFilePorperties = {};
        dataUnitFilePorperties.nameXml = "Accounts";
        dataUnitFilePorperties.data = {};
        dataUnitFilePorperties.data.rowLists = [];
        dataUnitFilePorperties.data.rowLists.push({ "rows": rows });

        jsonDoc.document.dataUnits.push(dataUnitFilePorperties);

        
    }

    checkIfAccountExists(existingAccounts,accountNumber,accountAlreadyExistent){
        for(var row in existingAccounts){
            var account=existingAccounts[row];
            if(account.accountNr==accountNumber){
                accountAlreadyExistent=true;  
                return accountAlreadyExistent;
            }
        }
        return accountAlreadyExistent;
    }

/**
 * This method returns the line number where the new account is to be inserted, and does so by searching through the existing accounts for the one with the closest value.
 * @param {*} existingAccounts the list of existing accounts
 * @param {*} accountNumber the new account
 * @returns 
 */
    getNewAccountIndex(existingAccounts,accountNumber){
        var refIndex="";
        var refValue="";
        var newAccountIndex="";
        var closest=0;
        for(var row in existingAccounts){
            var accountNr=existingAccounts[row].accountNr;
            var accountRowNr=existingAccounts[row].rowNr
            var difference=Banana.SDecimal.subtract(accountNumber,accountNr);
            //this algorithm finds the closest difference to zero, then saves the value and index (row) of the element with the smallest difference from the new account
            //works only with numerical accounts, for the time being the other types of accounts are inserted at the end of the chart of accounts.
            if(difference){
                if (closest === 0) {
                    closest = difference
                    refIndex=accountRowNr;
                    refValue=accountNr;
                } else if (difference > 0 && difference <= Math.abs(closest)) {
                    closest = difference
                    refIndex=accountRowNr;
                    refValue=accountNr;
                } else if (difference < 0 && - difference < Math.abs(closest)) {
                    closest = difference;
                    refIndex=accountRowNr;
                    refValue=accountNr;
                }
                //Banana.console.debug("row: "+accountRowNr+" / "+"difference: "+difference);
            }
        }
        //i have the index and the value of the account number more similar to the one i need to add.
        // Now check which one is bigger, so that I know whether to put the new account before or after the one found 
        //Banana.console.debug("final rowIndex: "+refIndex+" / "+refValue);

        if(refValue && refIndex){
            var compare=Banana.SDecimal.compare(accountNumber,refValue);
            //if the new account is bigger, increase the index by one, so the new account will be positioned after the reference one
            //if the new account is smaller, decrease the index bey one, and will be positioned before the reference one.
            if(compare==1)
            newAccountIndex=Banana.SDecimal.add(refIndex,1);
            else if (compare==-1)
            newAccountIndex=Banana.SDecimal.subtract(refIndex,1);

            //set the format of the line so that it is recognised as a valid sequence by the document change
            newAccountIndex+=".1";
            
            Banana.console.debug("final newRowIndex: "+newAccountIndex);
        }

        return newAccountIndex;
    }


    getAccountsTableRow() {

    var table = Banana.document.table("Accounts");
    if (!table) {
        return;
    }

    var accountRows=[];

    for (var i = 0; i < table.rowCount; i++) {
        let tRow = table.row(i);

        if(tRow.value("Account")){
            var account={};
            account.accountNr = tRow.value("Account");
            account.rowNr = tRow.rowNr;
            accountRows.push(account);
        }

    }
    return accountRows;
}

getTransactionRow(date,description,accountDebit,accountCredit,amount){
    var row = {};
    row.operation = {};
    row.operation.name = "add";
    row.fields = {};
    row.fields["Date"] = date;
    row.fields["Description"] = description;
    row.fields["AccountDebit"] = accountDebit;
    row.fields["AccountCredit"] = accountCredit;
    row.fields["Amount"] = amount;

    return row;
}

    /******************************************************************************
     * The methods in this section are used to create groupings, if a template is provided in the package,
     *  the groups already exist, so these methods are not used.
     ******************************************************************************/

    /**
     * 
     * 
     */

    getGroupRow() {
        var grRows = {};
        grRows.row = {};
        grRows.row.operation = {};
        grRows.row.operation.name = "add";
        grRows.row.fields = {};
        grRows.row.fields["Group"] = this.gr;
        grRows.row.fields["Description"] = "Total Group: "+this.gr;
        grRows.row.fields["Gr"] = this.getGroupTotal(this.bClass);
        grRows.emptyRow = this.getEmptyRow();

        return grRows;
    }

    getSectionRow() {
        var secRows = {};
        secRows.row = {};
        secRows.row.operation = {};
        secRows.row.operation.name = "add";
        secRows.row.fields = {};
        var group=this.getGroupTotal(this.bClass);
        secRows.row.fields["Group"] =group;
        secRows.row.fields["Description"] = "Total Section: "+group;
        secRows.row.fields["Gr"] = this.getSectionGr();
        //create an empty row to append after the total row
        secRows.emptyRow = this.getEmptyRow();
        return secRows;
    }

    getGroupTotal(){
        var groupTotal="";
        switch (this.bClass) {
            case "1":
                groupTotal = "A"
                return groupTotal;
            case "2":
                groupTotal = "P"
                return groupTotal;
            case "3":
                groupTotal = "C"
                return groupTotal;
            case "4":
                groupTotal = "R"
                return groupTotal;
            default:
                return groupTotal;
        }

    }

    getSectionGr() {
        var sectionTotal = "";
        switch (this.bClass) {
            case "1":
            case "2":
                sectionTotal = "00"
                return sectionTotal;
            case "3":
            case "4":
                sectionTotal = "02"
                return sectionTotal;
            default:
                return sectionTotal;
        }
    }

    getEmptyRow() {
        var emptyRow = {};
        emptyRow.operation = {};
        emptyRow.operation.name = "add";
        emptyRow.fields = {};

        return emptyRow;
    }

    /**************************************************
     * End Section
     **************************************************/

    /**
     * 
     * @param {*} transactionsRows 
     * @returns 
     */

    getAccountsList(transactionsRows){
        var accountsList=[];
        for (var i = 1; i < transactionsRows.length; i++) {
            if (transactionsRows[i][4] && transactionsRows[i][5]) {
                accountsList.push(transactionsRows[i][4]+"&$&"+transactionsRows[i][5]);
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

    getJContraAccounGroups(csvFile) {
        var values = [];
        for (var i = 1; i < csvFile.length; i++) {
            values.push(csvFile[i][2]); //third column = JContraAccountGroup
        }
        //Removing duplicates
        for (var i = 0; i < values.length; i++) {
            for (var x = i+1; x < values.length; x++) {
                if (values[x] === values[i]) {
                    values.splice(x,1);
                    --x;
                }
            }
        }
        return values;
    }

    getByValue(arr, value) {
        var x = [];
        for (var i=0, iLen=arr.length; i<iLen; i++) {
            if (arr[i][2] == value) {
                x.push(arr[i]);
            }
        }
        return x;
    }

    formatDate(date) {
        return [date.slice(0, 4), "-", date.slice(4, 6), "-", date.slice(6, 8)].join('');
        // 20191231 => return 2019-12-31
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
    var transactions = Banana.Converter.csvToArray(inData, '\t', '');


    var frAuditFilesImport = new FrAuditFilesImport(Banana.document);
    if (!frAuditFilesImport.verifyBananaVersion()) {
        return "@Cancel";
    }

    frAuditFilesImport.createJsonDocument(transactions);

    var jsonDoc = { "format": "documentChange", "error": "" };
    jsonDoc["data"] = frAuditFilesImport.jsonDocArray;

    return jsonDoc;
}