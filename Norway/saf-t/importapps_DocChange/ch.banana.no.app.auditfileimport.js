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
        this.accType = "";
        this.transId = "";
        this.analysisType="";

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
             * ADD THE COSTUMERS
             *********************************************************************/
            var customersNode = masterFilesNode.firstChildElement('n1:Customers');
            var customerNode = customersNode.firstChildElement('n1:Customer'); // First customer
            this.createJsonDocument_AddCustomersSupplier(jsonDoc, srcFileName, customerNode, 'n1:Customer');
            /*********************************************************************
             * ADD THE SUPPLIERS
             *********************************************************************/
            var suppliersNode = masterFilesNode.firstChildElement('n1:Suppliers');
            var supplierNode = suppliersNode.firstChildElement('n1:Supplier'); // First supplier
            this.createJsonDocument_AddCustomersSupplier(jsonDoc, srcFileName, supplierNode, 'n1:Supplier');

            /*********************************************************************
             * ADD THE COST AND PROFIT CENTERS
            *********************************************************************/
            this.createJsonDocument_AddCostandProfitCenters(jsonDoc, srcFileName, masterFilesNode);

            /*********************************************************************
             * ADD THE TRANSACTIONS
             *********************************************************************/
            this.createJsonDocument_AddTransactions(jsonDoc, xmlRoot, srcFileName);
            // se non è la versione giusta, avverto che l'importazione delle registrazioni è limitata a 100 righe
            if (!this.isAdvanced) {
                var msg = this.getErrorMessage(this.ID_ERR_LICENSE_NOTVALID, lang);
                this.banDocument.addMessage(msg, this.ID_ERR_LICENSE_NOTVALID);
            }

            /*********************************************************************
             * ADD THE SUBLEDGERS ELEMENTS
             *********************************************************************/
            //add the vat codes, solo se è presente la tabella vat
            var table = this.banDocument.table("VatCodes");
            if (table)
                this.createJsonDocument_AddVatCodes(jsonDoc, srcFileName, masterFilesNode);

        }

        this.jsonDocArray.push(jsonDoc);

    }
    /**
     * create the json structure to add the company information in the properties of the banana file
     * @param {*} jsonDoc json object already initialised with some values 
     * @param {*} srcFileName name of the audit file
     * @param {*} headerNode node from which I start deriving the values 
     */
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
     * retrieves company information from the xml file and saves it
     * @param {*} headerNode the xml company node
     * @returns the values i want to put in the file properties fields
     */
    getCompanyInfo(headerNode) {

        var companyInfos = [];
        var startDate = "";
        var endDate = "";
        var endDate = "";
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

            if (SelectionCriteriaNode.hasChildElements('n1:SelectionStartDate')) {
                startDate = SelectionCriteriaNode.firstChildElement('n1:SelectionStartDate').text;
                startDate = startDate.replace(/-/g, "");
            }
            if (SelectionCriteriaNode.hasChildElements('n1:SelectionEndDate')) {
                endDate = SelectionCriteriaNode.firstChildElement('n1:SelectionEndDate').text;
                endDate = endDate.replace(/-/g, "");
            }
        }

        basicCurrency = headerNode.firstChildElement('n1:DefaultCurrencyCode').text;


        //take the information from node: company
        if (headerNode.hasChildElements("n1:Company"))
            var companyNode = headerNode.firstChildElement("n1:Company");
        companyName = companyNode.firstChildElement('n1:Name').text;
        if (companyNode.hasChildElements('n1:RegistrationNumber'))
            companyIdentification = companyNode.firstChildElement('n1:RegistrationNumber').text;
        //address
        if (companyNode.hasChildElements('n1:Address'))
            streetAddressNode = companyNode.firstChildElement('n1:Address')
        companyStreetName = streetAddressNode.firstChildElement('n1:StreetName').text;
        if (streetAddressNode.hasChildElements('n1:PostalCode'))
            postalCode = streetAddressNode.firstChildElement('n1:PostalCode').text;
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
     * sets the fields to be modified in the file header
     * @returns 
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
     * 
     * create the json structure to add the vat codes in the vat table
     * @param {*} jsonDoc json object already initialised with some values 
     * @param {*} srcFileName name of the audit file
     * @param {*} headerNode node from which I start deriving the values 
     */
    createJsonDocument_AddVatCodes(jsonDoc, srcFileName, masterFilesNode) {
        var rows = [];
        var vatCodesNode = "";
        var vatNode = "";
        var vatCodeDetailsNode = "";
        var vatPerc = "";
        var vatAmtType = "";

        vatCodesNode = masterFilesNode.firstChildElement('n1:TaxTable');
        vatNode = vatCodesNode.firstChildElement('n1:TaxTableEntry');

        while (vatNode) {

            var vatCode = "";
            var vatCodeDescription = "";

            vatCodeDetailsNode = vatNode.firstChildElement('n1:TaxCodeDetails');

            vatCode = vatCodeDetailsNode.firstChildElement('n1:TaxCode').text;
            vatCodeDescription = vatCodeDetailsNode.firstChildElement('n1:Description').text;
            vatPerc = vatCodeDetailsNode.firstChildElement('n1:TaxPercentage').text;


            var row = {};
            row.operation = {};
            row.operation.name = "add";
            row.operation.srcFileName = srcFileName;
            row.fields = {};
            row.fields["VatCode"] = vatCode;
            row.fields["Description"] = vatCodeDescription;
            row.fields["VatRate"] = vatPerc;
            row.fields["AmountType"] = vatAmtType;

            rows.push(row);

            vatNode = vatNode.nextSiblingElement('n1:TaxTableEntry');
        }

        var dataUnitFilePorperties = {};
        dataUnitFilePorperties.nameXml = "VatCodes";
        dataUnitFilePorperties.data = {};
        dataUnitFilePorperties.data.rowLists = [];
        dataUnitFilePorperties.data.rowLists.push({ "rows": rows });

        // Banana.Ui.showText(JSON.stringify(dataUnitFilePorperties));

        jsonDoc.document.dataUnits.push(dataUnitFilePorperties);

    }

    /**
     * create the json structure to add the transactions in the transactions table
     * @param {*} jsonDoc json object already initialised with some values 
     * @param {*} srcFileName name of the audit file
     * @param {*} xmlRoot node from which I start deriving the values 
     */
    createJsonDocument_AddTransactions(jsonDoc, xmlRoot, srcFileName) {


        var rows = [];

        var generalLedgerEntriesNode = xmlRoot.firstChildElement('n1:GeneralLedgerEntries');
        var journalNode = generalLedgerEntriesNode.firstChildElement('n1:Journal');

        while (journalNode) {

            var transactionNode = journalNode.firstChildElement('n1:Transaction'); // First transaction
            while (transactionNode) {

                var trId = "";
                var trDate = "";
                var trDesc = "";

                if (transactionNode.hasChildElements('n1:TransactionID')) {
                    trId = transactionNode.firstChildElement('n1:TransactionID').text;
                }
                if (transactionNode.hasChildElements('n1:TransactionDate')) {
                    trDate = transactionNode.firstChildElement('n1:TransactionDate').text;
                }
                if (transactionNode.hasChildElements('n1:Description')) {
                    trDesc = transactionNode.firstChildElement('n1:Description').text;
                }

                //Banana.console.log("NEW TRANSACTION: " + trId + "; " + trDate + "; " + trDesc);

                var lineNode = transactionNode.firstChildElement('n1:Line'); // First lineNode
                while (lineNode) {

                    var recordId = "";
                    var accountId = "";
                    var sourceDocumentId = "";
                    var description = "";
                    var amount = "";
                    var vatId = "";
                    var analysisNode="";
                    //array for the cc (maximum of 3)
                    var analysisIDElements=[];

                    if (lineNode.hasChildElements('n1:RecordID')) {
                        recordId = lineNode.firstChildElement('n1:RecordID').text;
                    }
                    if (lineNode.hasChildElements('n1:AccountID')) {
                        accountId = lineNode.firstChildElement('n1:AccountID').text;
                    }
                    if (lineNode.hasChildElements('n1:SourceDocumentID')) {
                        sourceDocumentId = lineNode.firstChildElement('n1:SourceDocumentID').text;
                    } else {
                        if (lineNode.hasChildElements('n1:ReferenceNumber')) { //if SourceDocumentID does not extist we use ReferenceNumber
                            sourceDocumentId = lineNode.firstChildElement('n1:ReferenceNumber').text;
                        }
                    }
                    if (lineNode.hasChildElements('n1:Description')) {
                        description = lineNode.firstChildElement('n1:Description').text;
                    }
                    if (lineNode.hasChildElements('n1:DebitAmount')) {
                        var transactionDebitAccount = accountId;
                        var transactionCreditAccount = "";
                        var debitAmountNode = lineNode.firstChildElement('n1:DebitAmount');
                        if (debitAmountNode.hasChildElements('n1:Amount')) {
                            amount = debitAmountNode.firstChildElement('n1:Amount').text;
                        }
                    }
                    if (lineNode.hasChildElements('n1:CreditAmount')) {
                        var transactionDebitAccount = "";
                        var transactionCreditAccount = accountId;
                        var creditAmountNode = lineNode.firstChildElement('n1:CreditAmount');
                        if (creditAmountNode.hasChildElements('n1:Amount')) {
                            amount = creditAmountNode.firstChildElement('n1:Amount').text;
                        }
                    }

                    //row VAT 
                    if (lineNode.hasChildElements('n1:TaxInformation')) {
                        var lineVat = lineNode.firstChildElement('n1:TaxInformation');
                        vatId = lineVat.firstChildElement('n1:TaxCode').text;
                        if (vatId)
                            vatId = "[" + vatId + "]";
                    }

                    // Description of the transaction
                    var transactionDescription = "";
                    if (trDesc) {
                        transactionDescription = trDesc + ", " + description;
                    } else {
                        transactionDescription = description;
                    }

                    //Retrieve within the analysis tag, information on cost centres 
                    analysisNode=lineNode.firstChildElement('n1:Analysis');

                    while(analysisNode){
                        var analysisType=analysisNode.firstChildElement('n1:AnalysisType').text
                        var analysisID=analysisNode.firstChildElement('n1:AnalysisID').text;
                        if(analysisNode.hasChildElements('n1:AnalysisAmount'))
                        var analysisAmount=analysisNode.firstChildElement('n1:AnalysisAmount');

                        //if two CC are from the same level, it is necessary to split the transaction in two different rows, so the amount will be modified
                        if(this.analysisType==analysisType){
                            var newRow=this.getNewTransactionRow(trDate,trId,transactionDescription,transactionDebitAccount,transactionCreditAccount,analysisAmount,vatId);
                            rows.push(newRow);
                            amount=amount-analysisAmount;
                        }
                        this.analysisType=analysisType;
                        analysisNode = analysisNode.nextSiblingElement('n1:Analysis'); // next analysis line
                    }

                    var row = {};
                    row.operation = {};
                    row.operation.name = "add";
                    row.operation.srcFileName = srcFileName;
                    row.fields = {};
                    row.fields["Date"] = trDate;
                    row.fields["Doc"] = trId;
                    row.fields["Description"] = transactionDescription;
                    row.fields["AccountDebit"] = transactionDebitAccount;
                    row.fields["AccountCredit"] = transactionCreditAccount;
                    row.fields["Amount"] = amount;
                    row.fields["VatCode"] = vatId;
                    row.fields["Cc1"] = analysisIDElements[0];
                    row.fields["Cc2"] = analysisIDElements[1];
                    row.fields["Cc3"] = analysisIDElements[2];


                    rows.push(row);



                    lineNode = lineNode.nextSiblingElement('n1:Line'); // Next trLine
                }

                transactionNode = transactionNode.nextSiblingElement('n1:Transaction'); // Next transaction

                //add an empty row every new block of transactions
                if (this.transId !== trId) {
                    var emptyRow = this.getEmptyRow();
                    rows.push(emptyRow);
                }
                this.transId = trId;
            }
            journalNode = journalNode.nextSiblingElement('n1:Journal'); // Next journal
        }

        //se non è la versione advanced,limito le registrazioni importate a 100 righe
        if (!this.isAdvanced) {
            rows = rows.slice(0, 100);
        }

        var dataUnitFilePorperties = {};
        dataUnitFilePorperties.nameXml = "Transactions";
        dataUnitFilePorperties.data = {};
        dataUnitFilePorperties.data.rowLists = [];
        dataUnitFilePorperties.data.rowLists.push({ "rows": rows });

        jsonDoc.document.dataUnits.push(dataUnitFilePorperties);
    }

    /**
     * create the json structure to add the cost and profit centers in the Accounts table
     * @param {*} jsonDoc json object already initialised with some values 
     * @param {*} srcFileName name of the audit file
     * @param {*} masterFilesNode node from which I start deriving the values 
     */
    createJsonDocument_AddCostandProfitCenters(jsonDoc, srcFileName, masterFilesNode){
        if (!masterFilesNode)
        return "";

        var rows = [];
        var AnalysisTypeTable = ""
        var AnalysisTypeTableEntry = "";
        var costAndProfitCenterNumber=0;
        var costAndProfitCenterPrefix=".";

        AnalysisTypeTable = masterFilesNode.firstChildElement('n1:AnalysisTypeTable');
        AnalysisTypeTableEntry = AnalysisTypeTable.firstChildElement('n1:AnalysisTypeTableEntry');

        while (AnalysisTypeTableEntry) {

            var analysisType = "";
            var analysisTypeDescription = "";
            var analysisID = "";
            var analysisIDDescription= "";

            //each of these entries is mandatory within the node

            analysisType=AnalysisTypeTableEntry.firstChildElement('n1:AnalysisType').text;
            analysisTypeDescription=AnalysisTypeTableEntry.firstChildElement('n1:AnalysisTypeDescription').text;
            analysisID=AnalysisTypeTableEntry.firstChildElement('n1:AnalysisID').text;
            analysisIDDescription=AnalysisTypeTableEntry.firstChildElement('n1:AnalysisIDDescription').text;

            if(this.gr !==analysisType){
                var grRows = this.getGroupRow();
                rows.push(grRows.row);
                rows.push(grRows.emptyRow);
                //ogni volta che cambia gruppo significa che ho un centro di costo nuovo (per un massimo di tre)
                costAndProfitCenterNumber++
                costAndProfitCenterPrefix=this.setCCPrefix(costAndProfitCenterNumber);
            }

            var row = {};
            row.operation = {};
            row.operation.name = "add";
            row.operation.srcFileName = srcFileName;
            row.fields = {};
            row.fields["Account"] = costAndProfitCenterPrefix+analysisID;
            row.fields["Description"] = analysisIDDescription;
            row.fields["Gr"] = analysisType;


            rows.push(row);

            this.gr = analysisType;

            AnalysisTypeTableEntry = AnalysisTypeTableEntry.nextSiblingElement('n1:AnalysisTypeTableEntry');

        }

        var grRows = this.getGroupRow();
        rows.push(grRows.row);
        rows.push(grRows.emptyRow);

        this.gr="";


        var dataUnitFilePorperties = {};
        dataUnitFilePorperties.nameXml = "Accounts";
        dataUnitFilePorperties.data = {};
        dataUnitFilePorperties.data.rowLists = [];
        dataUnitFilePorperties.data.rowLists.push({ "rows": rows });

        // Banana.Ui.showText(JSON.stringify(dataUnitFilePorperties));

        jsonDoc.document.dataUnits.push(dataUnitFilePorperties);

    }



    /**
     * create the json structure to add the accounts in the Accounts table
     * @param {*} jsonDoc json object already initialised with some values 
     * @param {*} srcFileName name of the audit file
     * @param {*} masterFilesNode node from which I start deriving the values 
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

            /**
             * come scritto nella documentazione ufficiale, per mappare i conti in raggruppamenti posso usare l'elemento 'StandardAccountID', o in sua 
             * assenza posso utilizzare 'GroupingCode' o 'GroupingCategory '
             */
            if (accountNode.hasChildElements('n1:StandardAccountID'))
                gr = accountNode.firstChildElement('n1:StandardAccountID').text;
            else if (accountNode.hasChildElements('n1:GroupingCode'))
                gr = accountNode.firstChildElement('n1:GroupingCode');

            if (accountNode.hasChildElements('n1:AccountType'))
                accType = accountNode.firstChildElement('n1:AccountType').text;

            bclass = this.setBClassByAccount(accountNumber);

            if (accountNode.hasChildElements('n1:OpeningDebitBalance') || accountNode.hasChildElements('n1:OpeningCreditBalance')) {
                if (accountNode.hasChildElements('n1:OpeningDebitBalance')) {
                    opening = accountNode.firstChildElement('n1:OpeningDebitBalance').text;
                } else if (accountNode.hasChildElements('n1:OpeningCreditBalance')) {
                    var openingValue = accountNode.firstChildElement('n1:OpeningCreditBalance').text;
                    if (openingValue !== "0") {
                        opening = Banana.SDecimal.invert(accountNode.firstChildElement('n1:OpeningCreditBalance').text);
                    } else {
                        opening = openingValue; // 0
                    }
                }
            }

            //if the group change, we create a grouping row, same with the bclass
            if (this.gr != gr) {
                //carried over groups
                var grCarriedOver = this.setGroupCarriedOver(this.gr);
                var grCarrOverRows = this.getGroupRow_carriedOver(grCarriedOver);
                rows.push(grCarrOverRows.row);
                //normal groups
                var grRows = this.getGroupRow(this.accType);
                rows.push(grRows.row);
                rows.push(grRows.emptyRow);
            }

            if (this.bClass != bclass) {
                var secRows = this.getSectionRow(this.accType);
                rows.push(secRows.row);
                rows.push(secRows.emptyRow);
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
            this.bClass = bclass;
            this.accType = accType;


            accountNode = accountNode.nextSiblingElement('n1:Account');
        }

        //alla fine aggiungo ancora il raggruppamento e la sezione finale riprendendo gli ultimi elementi salvati
        //last group
        var grRows = this.getGroupRow(accType);
        rows.push(grRows.row);
        rows.push(grRows.emptyRow);
        //last section
        var secRows = this.getSectionRow(accType);
        rows.push(secRows.row);
        rows.push(secRows.emptyRow);

        //aggiungo il totale del CE (utile o perdita)
        var totCeRow = this.getTotCeRow();
        rows.push(totCeRow.row);
        rows.push(totCeRow.emptyRow);

        //aggiungo la differenza del Bilancio (dovrebbe essere zero)
        var balanceDiff = this.getBalanceDiff();
        rows.push(balanceDiff.row);
        rows.push(balanceDiff.emptyRow);

        this.bclass="";
        this.gr="";


        var dataUnitFilePorperties = {};
        dataUnitFilePorperties.nameXml = "Accounts";
        dataUnitFilePorperties.data = {};
        dataUnitFilePorperties.data.rowLists = [];
        dataUnitFilePorperties.data.rowLists.push({ "rows": rows });

        // Banana.Ui.showText(JSON.stringify(dataUnitFilePorperties));

        jsonDoc.document.dataUnits.push(dataUnitFilePorperties);


    }

    /**
     * create the json structure to add the customers and suppliers in the Accounts table
     * @param {*} jsonDoc json object already initialised with some values 
     * @param {*} srcFileName name of the audit file
     * @param {*} masterFilesNode node from which I start deriving the values 
     */
    createJsonDocument_AddCustomersSupplier(jsonDoc, srcFileName, xmlNode, xmlTagName) {

        var rows = [];

        while (xmlNode) { // For each customerSupplierNode

            var accountNumber = "";
            var accountId = "";
            var accountType = ""; // DEB(costumers) if accountId is a passive Account, CRED(suppliers)
            var accountDescription = "";
            var accountOpening = "";
            var gr = "";
            var bclass = "";
            var nameprefix = "";
            var firstname = "";
            var familyname = "";
            var street = "";
            var zip = "";
            var locality = "";
            var countryCode = "";
            var phoneMain = "";
            var fax = "";
            var email = "";
            var website = "";
            var bankiban = "";


            if (xmlNode.hasChildElements(xmlTagName + 'ID'))
                accountNumber = xmlNode.firstChildElement(xmlTagName + 'ID').text;

            if (xmlNode.hasChildElements('n1:AccountID')) {
                accountId = xmlNode.firstChildElement('n1:AccountID').text;
                accountType = this.setAccountType(accountId);
                bclass = this.setBClassByAccount(accountId);
                gr = this.setCSGrByBclass(bclass);
            }

            if (xmlNode.hasChildElements('n1:Name'))
                accountDescription = xmlNode.firstChildElement('n1:Name').text;

            if (xmlNode.hasChildElements('n1:OpeningDebitBalance') || xmlNode.hasChildElements('n1:OpeningCreditBalance')) {
                if (xmlNode.hasChildElements('n1:OpeningDebitBalance')) {
                    accountOpening = xmlNode.firstChildElement('n1:OpeningDebitBalance').text;
                } else if (xmlNode.hasChildElements('n1:OpeningCreditBalance')) {
                    var openingValue = xmlNode.firstChildElement('n1:OpeningCreditBalance').text;
                    if (openingValue !== "0") {
                        accountOpening = Banana.SDecimal.invert(xmlNode.firstChildElement('n1:OpeningCreditBalance').text);
                    } else {
                        accountOpening = openingValue; // 0
                    }
                }
            }

            if (xmlNode.hasChildElements('n1:Contact')) {
                var contactNode = xmlNode.firstChildElement('n1:Contact');
                if (contactNode.hasChildElements('n1:Telephone'))
                    phoneMain = contactNode.firstChildElement('n1:Telephone').text;
                if (contactNode.hasChildElements('n1:Fax'))
                    fax = contactNode.firstChildElement('n1:Fax').text;
                if (contactNode.hasChildElements('n1:Email'))
                    email = contactNode.firstChildElement('n1:Email').text;
                if (contactNode.hasChildElements('n1:Website'))
                    website = contactNode.firstChildElement('n1:Website').text;
                if (contactNode.hasChildElements('n1:Salutation')) {
                    var nameprefix = contactNode.firstChildElement('n1:Salutation').text;
                }
            }

            if (xmlNode.hasChildElements('n1:Address')) {
                var streetAddressNode = xmlNode.firstChildElement('n1:Address');
                if (streetAddressNode.hasChildElements('n1:StreetName')) {
                    street = streetAddressNode.firstChildElement('n1:StreetName').text;
                }
                if (streetAddressNode.hasChildElements('n1:PostalCode')) {
                    zip = streetAddressNode.firstChildElement('n1:PostalCode').text;
                }
                if (streetAddressNode.hasChildElements('n1:City')) {
                    locality = streetAddressNode.firstChildElement('n1:City').text;
                }
                if (streetAddressNode.hasChildElements('n1:Country')) {
                    countryCode = streetAddressNode.firstChildElement('n1:Country').text;
                }
            }

            if (xmlNode.hasChildElements('n1:BankAccount')) {
                var bankAccountNode = xmlNode.firstChildElement('n1:BankAccount');
                if (bankAccountNode.hasChildElements('n1:IBANNumber')) {
                    bankiban = bankAccountNode.firstChildElement('n1:IBANNumber').text;
                }
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
            row.fields["Opening"] = accountOpening;
            row.fields["NamePrefix"] = nameprefix;
            row.fields["FirstName"] = firstname;
            row.fields["FamilyName"] = familyname;
            row.fields["Street"] = street;
            row.fields["PostalCode"] = zip;
            row.fields["Locality"] = locality;
            row.fields["CountryCode"] = countryCode;
            row.fields["PhoneMain"] = phoneMain;
            row.fields["Fax"] = fax;
            row.fields["EmailWork"] = email;
            row.fields["Website"] = website;
            row.fields["BankIban"] = bankiban;

            rows.push(row);

            this.bClass = bclass;

            xmlNode = xmlNode.nextSiblingElement(xmlTagName); // Next customerSupplier
        }

        //provo a ritornare le righe ed inserirle assieme ai conti normali nel punto giusto

        var secRows = this.getSectionRow(accountType);
        rows.push(secRows.row);
        rows.push(secRows.emptyRow);

        this.bClass="";

        var dataUnitFilePorperties = {};
        dataUnitFilePorperties.nameXml = "Accounts";
        dataUnitFilePorperties.data = {};
        dataUnitFilePorperties.data.rowLists = [];
        dataUnitFilePorperties.data.rowLists.push({ "rows": rows });

        jsonDoc.document.dataUnits.push(dataUnitFilePorperties);


    }
    /**
     * sets the account type for customers and suppliers
     * @param {*} accountId 
     * @returns 
     */
    setAccountType(accountId) {
        var accType = "";
        if (accountId.substr(0, 1) == "2")
            accType = "CRE";
        else if (accountId.substr(0, 1) == "1")
            accType = "DEB";
        return accType
    }

    /**
     * sets the account type for customers and suppliers
     * @param {*} bClass 
     * @returns 
     */
    setCSGrByBclass(bClass) {
        var gr = "";
        switch (bClass) {
            case "1":
                gr = "DEB"
                return gr;
            case "2":
                gr = "CRE"
                return gr;
            default:
                return gr;
        }
    }

    /**
     * Creates a new Row if there is a record with two cost centres of the same level
     * @returns 
     */
    getNewTransactionRow(trDate,trId,transactionDescription,transactionDebitAccount,transactionCreditAccount,amount,vatId){

        var row = {};
        row.operation = {};
        row.operation.name = "add";
        row.fields = {};
        row.fields["Date"] = trDate;
        row.fields["Doc"] = trId;
        row.fields["Description"] = transactionDescription;
        row.fields["AccountDebit"] = transactionDebitAccount;
        row.fields["AccountCredit"] = transactionCreditAccount;
        row.fields["Amount"] = amount;
        row.fields["VatCode"] = vatId;
        row.fields["Cc1"] = "";
        row.fields["Cc2"] = "";
        row.fields["Cc3"] = "";

        return row;
    }

    /**
     * creates a grouping row 
     * @param {*} accType 
     * @returns 
     */
    getGroupRow(accType) {
        var grRows = {};
        if (!this.gr)
            return grRows;
        grRows.row = {};
        grRows.row.operation = {};
        grRows.row.operation.name = "add";
        grRows.row.fields = {};
        grRows.row.fields["Group"] = this.gr;
        grRows.row.fields["Description"] = this.setGroupDescription();
        grRows.row.fields["Gr"] = this.setGroupTotal(accType);
        grRows.emptyRow = this.getEmptyRow();

        return grRows;
    }

    /**
     * sets the groups to be reported in the balance
     * @returns 
     */
    setGroupCarriedOver() {
        var grCarriedOver = {};
        switch (this.gr) {
            //verificare di prendere il gruppo corretto
            case "27":
                grCarriedOver.gr = "0511"
                grCarriedOver.description = "ÅRSRESULTAT"
                return grCarriedOver;
        }
    }

    /**
     * sets the cost centre prefix depending on how many cost centres already exist. in banana you can have up to three cost centres
     * @param {*} costAndProfitCenterNumber counter saving the number of existing cost centres
     * @returns 
     */
    setCCPrefix(costAndProfitCenterNumber){
        var prefix="";
        switch(costAndProfitCenterNumber){
            case  1:
                prefix ="."
                return prefix;
            case  2:
                prefix =","
                return prefix;
            case  3:
                prefix =";"
                return prefix;
            //aggiungere messaggio di errore    
            default:
                return "Too many CC, max 3 ";
        }
    }

    /**
     * creates a carried overgrouping row
     * @param {*} grCarriedOver 
     * @returns 
     */
    getGroupRow_carriedOver(grCarriedOver) {
        var grRows = {};
        if (grCarriedOver != null) {
            grRows.row = {};
            grRows.row.operation = {};
            grRows.row.operation.name = "add";
            grRows.row.fields = {};
            grRows.row.fields["Group"] = grCarriedOver.gr;
            grRows.row.fields["Description"] = grCarriedOver.description;
            grRows.row.fields["Gr"] = this.gr;
        }
        return grRows;
    }

    /**
     * creates a section row
     * @param {*} accType 
     * @returns 
     */
    getSectionRow(accType) {
        var secRows = {};
        secRows.row = {};
        secRows.row.operation = {};
        secRows.row.operation.name = "add";
        secRows.row.fields = {};
        secRows.row.fields["Group"] = this.setGroupTotal(accType);
        secRows.row.fields["Description"] = this.SetSectionDescription(this.bClass);
        secRows.row.fields["Gr"] = this.setSectionGr(accType);
        //create an empty row to append after the total row
        secRows.emptyRow = this.getEmptyRow();
        return secRows;
    }

/**
 * Sets the column gr (sumIn) to the grouping row of the group, taking the class as criterion
 * @param {*} accType account type, GL (general ledger) indicates an account belonging to the balance sheet or the profit and loss account.
 * if it is nota GL type is a customero supplier account.
 * @returns 
 */
    setGroupTotal(accType) {
        var groupTotal = "";

        if(!accType)
            return groupTotal

        if (accType == "GL") { //if it is a general ledger account
            switch (this.bClass) {
                case "1":
                    groupTotal = "1.1"
                    return groupTotal;
                case "2":
                    groupTotal = "2.2"
                    return groupTotal;
                case "3":
                    groupTotal = "3.3"
                    return groupTotal;
                case "4":
                case "5":
                case "6":
                case "7":
                    groupTotal = "4.4"
                    return groupTotal;
                case "8":
                    groupTotal = "8.8"
                    return groupTotal;
                default:
                    return groupTotal;
            }
        } else { // So if it is a customer or supplier
            switch (this.bClass) {
                case "1":
                    groupTotal = "DEB"
                    return groupTotal;
                case "2":
                    groupTotal = "CRE"
                    return groupTotal;
            }
        }
    }

    /**
     * Sets the column gr (sumIn) to the grouping row of the section, taking as criteria the class
     * @param {*} accType account type, GL (general ledger) indicates an account belonging to the balance sheet or the profit and loss account 
     * @returns 
     */
    setSectionGr(accType) {
        var sectionTotal = "";
        if (accType == "GL") { //if it is a general ledger account
            switch (this.bClass) {
                case "1":
                case "2":
                    sectionTotal = "00"
                    return sectionTotal;
                case "3":
                case "4":
                case "5":
                case "6":
                case "7":
                case "8":
                    sectionTotal = "02"
                    return sectionTotal;
                default:
                    return sectionTotal;
            }
        }else{
            return sectionTotal;
        }
    }

    /**
     * sets the description of the grouping depending on the group
     * @returns the grouping description
     */
    setGroupDescription() {
        var descr = "";
        //set only the groups that are not signed as free: http://www.eholding.no/regnskap/norsk-standard-kontoplan.htm
        switch (this.gr) {
            //Active Groups, Bclass 1.
            case "10":
                descr = "Immaterielle eiendeler ol. "
                return descr;
            case "11":
                descr = "Tomter, bygninger, fast eiendom ol"
                return descr;
            case "12":
                descr = "Transportmidler, inventar, maskiner ol."
                return descr;
            case "13":
                descr = "Finansielle anleggsmidler"
                return descr;
            case "14":
                descr = "Varelager og forskudd til leverandører"
                return descr;
            case "15":
                descr = " Kortsiktige fordringer"
                return descr;
            case "16":
                descr = "Merverdiavgift, opptjente offentlige tilskudd ol"
                return descr;
            case "17":
                descr = "Forskuddsbetalte kostnader, påløpte inntekter ol"
                return descr;
            case "18":
                descr = "Kortsiktige finansinvesteringer"
                return descr;
            case "19":
                descr = "Kontanter, bankinnskudd ol"
                return descr;
                //Passive Groups, Bclass 2.
            case "20":
                descr = " Egenkapital"
                return descr;
            case "21":
                descr = "Avsetning for forpliktelser"
                return descr;
            case "22":
                descr = "TAnnen langsiktig gjeld"
                return descr;
            case "23":
                descr = "Kortsiktige konvertible lån, sertifikatlån og gjeld til kredittinstitusjoner"
                return descr;
            case "24":
                descr = "Leverandørgjeld"
                return descr;
            case "25":
                descr = "Betalbar skatt"
                return descr;
            case "26":
                descr = "Skattetrekk og andre trekk"
                return descr;
            case "27":
                descr = "Skyldige offentlige avgifte"
                return descr;
            case "28":
                descr = " Utbytte"
                return descr;
            case "29":
                descr = "Annen kortsiktig gjeld"
                return descr;
                //Sales, Bclass 3.
            case "30":
                descr = " Salgsinntekt, avgiftspliktig"
                return descr;
            case "31":
                descr = "Salgsinntekt, avgiftsfri"
                return descr;
            case "32":
                descr = "Salgsinntekt, utenfor avgiftsområde"
                return descr;
            case "33":
                descr = "Offentlig avgift vedrørende omsetning"
                return descr;
            case "34":
                descr = "Offentlig tilskudd/refusjon"
                return descr;
            case "35":
                descr = "Uopptjent inntekt"
                return descr;
            case "36":
                descr = " Leieinntekt"
                return descr;
            case "37":
                descr = "Provisjonsinntekt"
                return descr;
            case "38":
                descr = " Gevinst ved avgang av anleggsmidle"
                return descr;
            case "39":
                descr = "Annen driftsrelatert inntekt"
                return descr;
                //Merchandise Costs, Bclass 4.
            case "40":
                descr = "Forbruk av råvarer og innkjøpte halvfabrikata"
                return descr;
            case "41":
                descr = "Forbruk av varer under tilvirkning"
                return descr;
            case "42":
                descr = "Forbruk av ferdig tilvirkede varer"
                return descr;
            case "43":
                descr = "Forbruk av varer for videresalg"
                return descr;
            case "45":
                descr = "Fremmedytelser og underentreprise"
                return descr;
            case "49":
                descr = "Annen periodisering"
                return descr;
                //Personnel Costs, Bclass 5.
            case "50":
                descr = "Lønn ansatte"
                return descr;
            case "52":
                descr = "Fordel i arbeidsforhold "
                return descr;
            case "53":
                descr = "Annen oppgavepliktig godtgjørelse"
                return descr;
            case "54":
                descr = "Arbeidsgiveravgift og pensjonskostnad"
                return descr;
            case "59":
                descr = "Annen personalkostnad"
                return descr;
                //Other Costs, Bclass 6-7.
            case "60":
                descr = "Lønn ansatte"
                return descr;
            case "61":
                descr = "Frakt og transportkostnad vedrørende salg"
                return descr;
            case "62":
                descr = " Energi, brensel og vann vedrørende produksjon"
                return descr;
            case "63":
                descr = " Kostnad lokaler"
                return descr;
            case "64":
                descr = "Leie maskiner, inventar ol"
                return descr;
            case "65":
                descr = "Verktøy, inventar og driftsmaterialer som ikke skal aktiveres"
                return descr;
            case "66":
                descr = "Reparasjon og vedlikehold"
                return descr;
            case "67":
                descr = "Fremmed tjeneste"
                return descr;
            case "68":
                descr = "Kontorkostnad, trykksak ol"
                return descr;
            case "69":
                descr = "Telefon, porto ol"
                return descr;
            case "70":
                descr = "Lønn ansatte"
                return descr;
            case "71":
                descr = "Frakt og transportkostnad vedrørende salg"
                return descr;
            case "72":
                descr = " Energi, brensel og vann vedrørende produksjon"
                return descr;
            case "73":
                descr = " Kostnad lokaler"
                return descr;
            case "74":
                descr = "Leie maskiner, inventar ol"
                return descr;
            case "75":
                descr = "Verktøy, inventar og driftsmaterialer som ikke skal aktiveres"
                return descr;
            case "76":
                descr = "Reparasjon og vedlikehold"
                return descr;
            case "77":
                descr = "Fremmed tjeneste"
                return descr;
            case "78":
                descr = "Kontorkostnad, trykksak ol"
                return descr;
            case "79":
                descr = "Telefon, porto ol"
                return descr;
                //Financial Income and expenses
            case "80":
                descr = "Finansinntekt"
                return descr;
            case "81":
                descr = "Finanskostnad"
                return descr;
            case "83":
                descr = "Skattekostnad på ordinært resultat"
                return descr;
            case "84":
                descr = "Ekstraordinær inntekt (spes. etter art)"
                return descr;
            case "85":
                descr = "Ekstraordinær kostnad (spes. etter art)"
                return descr;
            case "86":
                descr = "Skattekostnad på ekstraordinært resultat"
                return descr;
            case "88":
                descr = "Årsresultat"
                return descr;
            case "89":
                descr = "Overføringer og disponeringer"
                return descr;
            default:
                return "Total group: " + this.gr;

        }
    }

    /**
     * sets the description of the section depending on the class
     * @returns the section's description
     */
    SetSectionDescription() {
        var descr = "";
        switch (this.bClass) {
            case "1":
                descr = "EIENDELER"
                return descr;
            case "2":
                descr = "EGENKAPITAL OG GJELD"
                return descr;
            case "3":
                descr = "SALGS- OG DRIFRSINNTEKT"
                return descr;
            case "4":
            case "5":
            case "6":
            case "7":
                descr = "DRIFTSKOSTNAD"
                return descr;
            case "8":
                descr = "FINANSINNTEKT OF -KOSTNAD, EKSTRAORINAER INNTEKT OG -KOSTNAD OG SKATT"
                return descr;
            default:
                return descr;
        }
    }
    /**
     * creates the line for the profit and loss account result
     * @returns 
     */
    getTotCeRow() {
        var ceRows = {};
        ceRows.row = {};
        ceRows.row.operation = {};
        ceRows.row.operation.name = "add";
        ceRows.row.fields = {};
        ceRows.row.fields["Group"] = "02";
        ceRows.row.fields["Description"] = "ÅRSRESULTAT";
        ceRows.row.fields["Gr"] = "0511";

        return ceRows;
    }

    /**
     * creates the line for the budget result
     * @returns 
     */
    getBalanceDiff() {
        var balanceRows = {};
        balanceRows.row = {};
        balanceRows.row.operation = {};
        balanceRows.row.operation.name = "add";
        balanceRows.row.fields = {};
        balanceRows.row.fields["Group"] = "00";
        balanceRows.row.fields["Description"] = "Skillnaden måste vara noll (tom cell)";
        balanceRows.emptyRow = this.getEmptyRow();

        return balanceRows;
    }
    /**
     * creates an empty row
     * @returns
     */
    getEmptyRow() {
        var emptyRow = {};
        emptyRow.operation = {};
        emptyRow.operation.name = "add";
        emptyRow.fields = {};

        return emptyRow;
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

    /**
     * initialises the structure of the json object
     * @returns 
     */
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