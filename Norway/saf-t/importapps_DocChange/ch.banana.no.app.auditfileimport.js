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
            this.accType="";
            this.transId="";

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
                this.createJsonDocument_AddCustomers(jsonDoc, srcFileName, masterFilesNode);
                this.createJsonDocument_AddSuppliers(jsonDoc, srcFileName, masterFilesNode);

                /*********************************************************************
                 * ADD THE TRANSACTIONS
                 *********************************************************************/
                this.createJsonDocument_AddTransactions(jsonDoc, xmlRoot, companyNode, srcFileName);
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
            var endDate = "";
            var endDate="";
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

                if(SelectionCriteriaNode.hasChildElements('n1:SelectionStartDate')){
                    startDate = SelectionCriteriaNode.firstChildElement('n1:SelectionStartDate').text;
                    startDate=startDate.replace(/-/g, "");
                }
                if(SelectionCriteriaNode.hasChildElements('n1:SelectionEndDate')){
                    endDate = SelectionCriteriaNode.firstChildElement('n1:SelectionEndDate').text;
                    endDate=endDate.replace(/-/g, "");
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

        createJsonDocument_AddVatCodes(jsonDoc, srcFileName, masterFilesNode){
            var rows = [];
            var vatCodesNode = "";
            var vatNode = "";
            var vatCodeDetailsNode="";
            var vatPerc="";
            var vatAmtType="";
    
            vatCodesNode = masterFilesNode.firstChildElement('n1:TaxTable');
            vatNode = vatCodesNode.firstChildElement('n1:TaxTableEntry');
    
            while (vatNode) {
    
                var vatCode="";
                var vatCodeDescription = "";

                vatCodeDetailsNode = vatNode.firstChildElement('n1:TaxCodeDetails');

                vatCode=vatCodeDetailsNode.firstChildElement('n1:TaxCode').text;
                vatCodeDescription = vatCodeDetailsNode.firstChildElement('n1:Description').text;
                vatPerc=vatCodeDetailsNode.firstChildElement('n1:TaxPercentage').text;
    
    
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

        createJsonDocument_AddTransactions(jsonDoc, xmlRoot, companyNode, srcFileName) {


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
                        var vatId="";
        
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
                        if(vatId)
                            vatId="[" + vatId + "]";
                    }
        
                        // Description of the transaction
                        var transactionDescription = "";
                        if (trDesc) {
                            transactionDescription = trDesc + ", " + description;
                        } else {
                            transactionDescription = description;
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
                        //row.fields["VatCode"] = "["+trLineVatId+"]";


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
                rows=rows.slice(0,100);
            }

            var dataUnitFilePorperties = {};
            dataUnitFilePorperties.nameXml = "Transactions";
            dataUnitFilePorperties.data = {};
            dataUnitFilePorperties.data.rowLists = [];
            dataUnitFilePorperties.data.rowLists.push({ "rows": rows });
    
            jsonDoc.document.dataUnits.push(dataUnitFilePorperties);
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

                /**
                 * come scritto nella documentazione ufficiale, per mappare i conti in raggruppamenti posso usare l'elemento 'StandardAccountID', o in sua 
                 * assenza posso utilizzare 'GroupingCode' o 'GroupingCategory '
                 */
                if (accountNode.hasChildElements('n1:StandardAccountID'))
                    gr = accountNode.firstChildElement('n1:StandardAccountID').text;
                else if(accountNode.hasChildElements('n1:GroupingCode'))
                    gr = accountNode.firstChildElement('n1:GroupingCode');

                if (accountNode.hasChildElements('n1:AccountType'))
                    accType = accountNode.firstChildElement('n1:AccountType').text;

                bclass = this.setBClassByAccount(accountNumber);

                if (accountNode.hasChildElements('n1:OpeningDebitBalance'))
                    opening = accountNode.firstChildElement('n1:OpeningDebitBalance').text;
                if (accountNode.hasChildElements('n1:OpeningCreditBalance')){
                    opening = accountNode.firstChildElement('n1:OpeningCreditBalance').text;
                    opening=Banana.SDecimal.invert(opening);
                }


                //if the group change, we create a grouping row, same with the bclass
                if (this.gr != gr) {

                    //carried over groups
                    var grCarriedOver = this.getGroupCarriedOver(this.gr);
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
                this.bClass=bclass;
                this.accType=accType;


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


            var dataUnitFilePorperties = {};
            dataUnitFilePorperties.nameXml = "Accounts";
            dataUnitFilePorperties.data = {};
            dataUnitFilePorperties.data.rowLists = [];
            dataUnitFilePorperties.data.rowLists.push({ "rows": rows });

            // Banana.Ui.showText(JSON.stringify(dataUnitFilePorperties));

            jsonDoc.document.dataUnits.push(dataUnitFilePorperties);


        }

        createJsonDocument_AddCustomers(jsonDoc, srcFileName, masterFilesNode) {

            //creates the row that indicates
            //fare in modo che vengano divisi i clienti con i fornitori nel piano dei conti
    
            var rows = [];
            //svuoto la variabile già utilizzata per i conti del bilancio e conto economico
            this.bClass = "";
            var customersNode="";
            var customerNode="";

            if(masterFilesNode.hasChildElements('n1:Customers')){
                customersNode=masterFilesNode.firstChildElement('n1:Customers');
                customerNode=customersNode.firstChildElement('n1:Customer');
            }

    
            while (customerNode) { // For each customerSupplierNode

                var accountNumber = "";
                var accountId="";
                var accountType=""; // DEB(costumers) if accountId is a passive Account, CRED(suppliers)
                var accountDescription = "";
                var openingDebitBalance="";
                var gr = "";
                var bclass = "";
                var accountOpening = "";
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

    
                if (customerNode.hasChildElements('n1:CustomerID'))
                    accountNumber = customerNode.firstChildElement('n1:CustomerID').text;

                if (customerNode.hasChildElements('n1:AccountID')){
                    accountId = customerNode.firstChildElement('n1:AccountID').text;
                    accountType=this.setAccountType(accountId);
                    bclass = this.setBClassByAccount(accountId);
                    gr = this.setCSGrByBclass(bclass);
                }

                if (customerNode.hasChildElements('n1:Name'))
                    accountDescription = customerNode.firstChildElement('n1:Name').text;

                if (customerNode.hasChildElements('n1:OpeningDebitBalance'))
                    openingDebitBalance = customerNode.firstChildElement('n1:OpeningDebitBalance').text;

                if (customerNode.hasChildElements('n1:Contact')) {
                    var contactNode=customerNode.firstChildElement('n1:Contact');
                    if(contactNode.hasChildElements('n1:Telephone'))
                        phoneMain = contactNode.firstChildElement('n1:Telephone').text;
                    if(contactNode.hasChildElements('n1:Fax'))
                        fax=contactNode.firstChildElement('n1:Fax').text;
                    if (contactNode.hasChildElements('n1:Email')) 
                            email = contactNode.firstChildElement('n1:Email').text;
                    if (contactNode.hasChildElements('n1:Website'))
                            website = contactNode.firstChildElement('n1:Website').text;
                }
    
                if (customerNode.hasChildElements('n1:Address')) {
                    var streetAddressNode = customerNode.firstChildElement('n1:Address');
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
    
                if (customerNode.hasChildElements('n1:BankAccount')) {
                    var bankAccountNode = customerNode.firstChildElement('n1:BankAccount');
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
                row.fields["Opening"] = openingDebitBalance;
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
    
                customerNode = customerNode.nextSiblingElement('n1:Customer'); // Next customerSupplier
            }

            var secRows = this.getSectionRow(accountType);
            rows.push(secRows.row);
            rows.push(secRows.emptyRow);
    
            var dataUnitFilePorperties = {};
            dataUnitFilePorperties.nameXml = "Accounts";
            dataUnitFilePorperties.data = {};
            dataUnitFilePorperties.data.rowLists = [];
            dataUnitFilePorperties.data.rowLists.push({ "rows": rows });
    
            jsonDoc.document.dataUnits.push(dataUnitFilePorperties);
    
    
        }

        createJsonDocument_AddSuppliers(jsonDoc, srcFileName, masterFilesNode) {

            //creates the row that indicates
            //fare in modo che vengano divisi i clienti con i fornitori nel piano dei conti
    
            var rows = [];
            //svuoto la variabile già utilizzata per i conti del bilancio e conto economico
            this.bClass = "";
            var suppliersNode="";
            var supplierNode="";

            if(masterFilesNode.hasChildElements('n1:Suppliers')){
                suppliersNode=masterFilesNode.firstChildElement('n1:Suppliers');
                supplierNode=suppliersNode.firstChildElement('n1:Supplier');
            }

    
            while (supplierNode) { // For each customerSupplierNode

                var accountNumber = "";
                var accountId="";
                var accountType=""; // DEB(costumers) if accountId is a passive Account, CRED(suppliers)
                var accountDescription = "";
                var openingCreditBalance="";
                var gr = "";
                var bclass = "";
                var accountOpening = "";
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

    
                if (supplierNode.hasChildElements('n1:SupplierID'))
                    accountNumber = supplierNode.firstChildElement('n1:SupplierID').text;

                if (supplierNode.hasChildElements('n1:AccountID')){
                    accountId = supplierNode.firstChildElement('n1:AccountID').text;
                    accountType=this.setAccountType(accountId);
                    bclass = this.setBClassByAccount(accountId);
                    gr = this.setCSGrByBclass(bclass);
                }

                if(supplierNode.hasChildElements('n1:OpeningCreditBalance'))
                    openingCreditBalance=supplierNode.firstChildElement('n1:OpeningCreditBalance');

                if (supplierNode.hasChildElements('n1:Name'))
                    accountDescription = supplierNode.firstChildElement('n1:Name').text;

                if (supplierNode.hasChildElements('n1:Contact')) {
                    var contactNode=supplierNode.firstChildElement('n1:Contact');
                    if(contactNode.hasChildElements('n1:Telephone'))
                        phoneMain = contactNode.firstChildElement('n1:Telephone').text;
                    if(contactNode.hasChildElements('n1:Fax'))
                        fax=contactNode.firstChildElement('n1:Fax').text;
                    if (contactNode.hasChildElements('n1:Email')) 
                            email = contactNode.firstChildElement('n1:Email').text;
                    if (contactNode.hasChildElements('n1:Website'))
                            website = contactNode.firstChildElement('n1:Website').text;
                }
    
                if (supplierNode.hasChildElements('n1:Address')) {
                    var streetAddressNode = supplierNode.firstChildElement('n1:Address');
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
    
                if (supplierNode.hasChildElements('n1:BankAccount')) {
                    var bankAccountNode = supplierNode.firstChildElement('n1:BankAccount');
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
                row.fields["Opening"] = Banana.SDecimal.invert(openingCreditBalance);
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
    
                supplierNode = supplierNode.nextSiblingElement('n1:Supplier'); //next supplier
            }

            var secRows = this.getSectionRow(accountType);
            rows.push(secRows.row);
            rows.push(secRows.emptyRow);
    
    
            var dataUnitFilePorperties = {};
            dataUnitFilePorperties.nameXml = "Accounts";
            dataUnitFilePorperties.data = {};
            dataUnitFilePorperties.data.rowLists = [];
            dataUnitFilePorperties.data.rowLists.push({ "rows": rows });
    
            jsonDoc.document.dataUnits.push(dataUnitFilePorperties);
    
    
        }

        getCustomerSuppliersBalancesList(){

        }

        setAccountType(accountId){
            var accType="";
            if(accountId.substr(0,1)=="2")
                accType="CRE";
            else if(accountId.substr(0,1)=="1")
                accType="DEB";
            return accType
        }


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

        getGroupRow(accType) {
            var grRows = {};
            if (!this.gr)
                return grRows;
            grRows.row = {};
            grRows.row.operation = {};
            grRows.row.operation.name = "add";
            grRows.row.fields = {};
            grRows.row.fields["Group"] = this.gr;
            grRows.row.fields["Description"] = "Gr description";
            grRows.row.fields["Gr"] = this.getGroupTotal(accType);
            grRows.emptyRow = this.getEmptyRow();

            return grRows;
        }

        getGroupCarriedOver() {
            var grCarriedOver = {};
            switch (this.gr) {
                //verificare di prendere il gruppo corretto
                case "27":
                    grCarriedOver.gr = "0511"
                    grCarriedOver.description = "ÅRSRESULTAT"
                    return grCarriedOver;
                default:
                    return null;
            }
        }

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

        getSectionRow(accType) {
            var secRows = {};
            secRows.row = {};
            secRows.row.operation = {};
            secRows.row.operation.name = "add";
            secRows.row.fields = {};
            secRows.row.fields["Group"] = this.getGroupTotal(accType);
            secRows.row.fields["Description"] = this.getSectionDescription(this.bClass);
            secRows.row.fields["Gr"]=this.getSectionGr(accType);
            //create an empty row to append after the total row
            secRows.emptyRow = this.getEmptyRow();
            return secRows;
        }

        /**
         * 
         * @param {*} bClass element bclass
         * @param {*} PreviousAccType B if it an element from balance, C or S it's for customer and suppliers (i set this value manually,  it is not an information in the xml file)
         * @returns 
         */
        getGroupTotal(accType) {
            var groupTotal = "";
            if(accType=="GL"){//if it is a general ledger account
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
            }else{// So if it is a customer or supplier
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

        getSectionGr(accType){
            var sectionTotal = "";
            if(accType=="GL"){//if it is a general ledger account
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
            }else{// So if it is a customer or supplier
                switch (this.bClass) {
                    case "1":
                        sectionTotal = "03"
                        return sectionTotal;
                    case "2":
                        sectionTotal = "04"
                        return sectionTotal;
                }
            }
        }

        getSectionDescription(bClass) {
            var descr = "";
                switch (bClass) {
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