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


// @id = ch.banana.fr.app.fecimporttransactions.test
// @api = 1.0
// @pubdate = 2019-01-14
// @publisher = Banana.ch SA
// @description = <TEST ch.banana.fr.app.fecimporttransactions.js>
// @task = app.command
// @doctype = *.*
// @docproperties = 
// @outputformat = none
// @inputdataform = none
// @includejs = ../ch.banana.fr.app.fecimporttransactions.js
// @timeout = -1


var texts;

// Register test case to be executed
Test.registerTestCase(new ImportTransactionsTest());

// Here we define the class, the name of the class is not important
function ImportTransactionsTest() {

}

// This method will be called at the beginning of the test case
ImportTransactionsTest.prototype.initTestCase = function() {

}

// This method will be called at the end of the test case
ImportTransactionsTest.prototype.cleanupTestCase = function() {

}

// This method will be called before every test method is executed
ImportTransactionsTest.prototype.init = function() {

}

// This method will be called after every test method is executed
ImportTransactionsTest.prototype.cleanup = function() {

}

ImportTransactionsTest.prototype.testBananaApps = function() {

	//1.
	var csv = [
	["JournalCode","JournalLib","EcritureNum","EcritureDate","CompteNum","CompteLib","CompAuxNum","CompAuxLib","PieceRef","PieceDate","EcritureLib","Debit","Credit","EcritureLet","DateLet","ValidDate","Montantdevise","Idevise"].join("\t"),
	["base","Transactions","3","20190105","615560","Matériel de bureau","","","1","20190105","Achat matériel de bureau","80.00","","","","20190105","80.00","EUR"].join("\t"),
	["base","Transactions","3","20190105","531100","Caisse","","","1","20190105","Achat matériel de bureau","","80.00","","","20190105","-80.00","EUR"].join("\t"),
	["base","Transactions","4","20190106","531100","Caisse","","","2","20190106","Vente au comptant","8000.00","","","","20190106","8000.00","EUR"].join("\t"),
	["base","Transactions","4","20190106","701000","Ventes de produits finis","","","2","20190106","Vente au comptant","","8000.00","","","20190106","-8000.00","EUR"].join("\t"),
	["base","Transactions","5","20190201","512100","Compte courant bancaire","","","3","20190201","Paiement loyer et charges locatives","","5000.00","","","20190201","-5000.00","EUR"].join("\t"),
	["base","Transactions","5","20190201","613000","Loyer","","","3","20190201","Loyer","4000.00","","","","20190201","4000.00","EUR"].join("\t"),
	["base","Transactions","5","20190201","614000","Charges locatives et de copropriété","","","3","20190201","Charges locatives et de copropriété","1000.00","","","","20190201","1000.00","EUR"].join("\t"),
	["base","Transactions","8","20190301","607000","Achats de marchandises","","","4","20190301","Achats de marchandises","600.00","","","","20190301","600.00","EUR"].join("\t"),
	["base","Transactions","8","20190301","512100","Compte courant bancaire","","","4","20190301","Achats de marchandises","","600.00","","","20190301","-600.00","EUR"].join("\t"),
	["base","Transactions","9","20190402","514000","Compte courant postal","","","5","20190402","Variation des stocks ","200.00","","","","20190402","200.00","EUR"].join("\t"),
	["base","Transactions","9","20190402","713000","Variation des stocks ","","","5","20190402","Variation des stocks ","","200.00","","","20190402","-200.00","EUR"].join("\t")
	].join("\n");
	Test.logger.addCsv("This is a csv value", csv);

	var file = Banana.IO.getLocalFile("file:script/../test/testcases/sirenFEC20190109.txt");
    var stringifyFile = JSON.stringify(file.read(), "", "");
    var parsedFile = JSON.parse(stringifyFile);
    Test.logger.addCsv("----TXT----", parsedFile);
    
    var array1 = Banana.Converter.csvToArray(parsedFile); //from the script
    var array2 = Banana.Converter.csvToArray(csv);		  //manually inserted
	for (var i = 0; i < array1.length; i++) {
		for (var j = 0; j < array1[i].length; j++) {
			Test.assertIsEqual(array1[i][j],array2[i][j]);
		}
	}

	//2.
    var csvFile = Banana.Converter.csvToArray(parsedFile, '\t', '');
    Test.logger.addText("----TXT TO ARRAY----");
    Test.logger.addText(csvFile);

    //3.
    var transactions = [];
    var jContraAccountGroup = [3,4,5,8,9];
    for (var i = 0; i < jContraAccountGroup.length; i++) {
        transactions.push(getByValue(csvFile, jContraAccountGroup[i]));
    }
    
    Test.logger.addText("------TRANSACTIONS------");
    for (var i = 0; i < transactions.length; i++) {
        Test.logger.addText(JSON.stringify(transactions[i], "",""));
        Test.logger.addText("***");
    }

    //4.
    var importTransactionsFile = createImportTransactionsFile(transactions);
    Test.logger.addText("------IMPORT TRANSACTIONS FILE------");
    Test.logger.addText(importTransactionsFile);

}

