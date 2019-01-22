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
// @id = ch.banana.fr.app.fecexporttxt.js
// @api = 1.0
// @pubdate = 2019-01-22
// @publisher = Banana.ch SA
// @description = Fichiers des écritures comptables (FEC) - Exportation des mouvements (fichier de texte *.txt)
// @description.fr = Fichiers des écritures comptables (FEC) - Exportation des mouvements (fichier de texte *.txt)
// @doctype = *
// @encoding = utf-8
// @task = export.file
// @exportfilename = sirenFEC<Date>
// @exportfiletype = txt


/*
*   SUMMARY
*
*   Export data from banana to txt file following the specifications:
*
*   https://github.com/BananaAccounting/Europe/tree/master/France/FEC
* 
*/


/* Main function */
function exec(inData, options) {

    if (!Banana.document) {
      return "@Cancel";
    }

    var userParam = {};

    // Retrieve saved param
    var savedParam = Banana.document.getScriptSettings();
    if (savedParam && savedParam.length > 0) {
        userParam = JSON.parse(savedParam);
    }

    // If needed show the settings dialog to the user
    if (!options || !options.useLastSettings) {
        userParam = settingsDialog(); // From properties
    }

    if (!userParam) {
        return "@Cancel";
    }

    var txtFile = getDataType1(Banana.document, userParam.selectionStartDate, userParam.selectionEndDate);

    return txtFile;
}


/* Function that creates the header for the txt type 1 */
function createHeaderType1(txtFile) {
    txtFile += "JournalCode\t";     // Le code journal de l'écriture comptable 
    txtFile += "JournalLib\t";      // Le libellé journal de l'écriture comptable 
    txtFile += "EcritureNum\t";     // Le numéro sur une séquence continue de l'écriture comptable 
    txtFile += "EcritureDate\t";    // La date de comptabilisation de l'écriture comptable 
    txtFile += "CompteNum\t";       // Le numéro de compte, dont les trois premiers caractères doivent correspondre à des chiffres respectant les normes du plan comptable français
    txtFile += "CompteLib\t";       // Le libellé de compte, conformément à la nomenclature du plan comptable français 
    txtFile += "CompAuxNum\t";      // Le numéro de compte auxiliaire (à blanc si non utilisé) 
    txtFile += "CompAuxLib\t";      // Le libellé de compte auxiliaire (à blanc si non utilisé) 
    txtFile += "PieceRef\t";        // La référence de la pièce justificative 
    txtFile += "PieceDate\t";       // La date de la pièce justificative 
    txtFile += "EcritureLib\t";     // Le libellé de l'écriture comptable 
    txtFile += "Debit\t";           // Le montant au débit 
    txtFile += "Credit\t";          // Le montant au crédit 
    txtFile += "EcritureLet\t";     // Le lettrage de l'écriture comptable (à blanc si non utilisé) 
    txtFile += "DateLet\t";         // La date de lettrage (à blanc si non utilisé) 
    txtFile += "ValidDate\t";       // La date de validation de l'écriture comptable 
    txtFile += "Montantdevise\t";   // Le montant en devise (à blanc si non utilisé) 
    txtFile += "Idevise\n";         // L'identifiant de la devise (à blanc si non utilisé) 
    return txtFile;
}

/* Function that takes the data required for the type 1 txt template */
function getDataType1(banDoc, startDate, endDate) {

    var txtFile = "";

    /* txt row 1 */
    txtFile += createHeaderType1(txtFile);

    /* txt rows 2+ */
    var journal = banDoc.journal(banDoc.ORIGINTYPE_CURRENT, banDoc.ACCOUNTTYPE_NORMAL);
    var len = journal.rowCount;

    for (var i = 0; i < len; i++) {
        var tRow = journal.row(i);

        //From the journal we take only transactions rows between the period
        if (tRow.value('JOperationType') == banDoc.OPERATIONTYPE_TRANSACTION 
            && tRow.value('JDate') >= startDate && tRow.value('JDate') <= endDate) {

            txtFile += 'base\t';
            txtFile += 'Transactions\t';
            txtFile += tRow.value('JContraAccountGroup')+'\t';
            txtFile += formatDate(Banana.Converter.toDate(tRow.value('JDate'))) +'\t';
            txtFile += tRow.value('JAccount') +'\t';
            txtFile += tRow.value('JAccountDescription') +'\t';
            txtFile += '\t';
            txtFile += '\t';
            txtFile += tRow.value('Doc') +'\t';
            txtFile += formatDate(Banana.Converter.toDate(tRow.value('JDate'))) +'\t';
            txtFile += tRow.value('JDescription') + '\t';

            // Amount: debit(positive), credit(negative)
            if (Banana.SDecimal.sign(tRow.value('JAmount')) == 1) {
                txtFile += tRow.value('JAmount') + '\t';
                txtFile += '\t';
            }
            else if (Banana.SDecimal.sign(tRow.value('JAmount')) == -1) {
                txtFile += '\t';
                txtFile += Banana.SDecimal.abs(tRow.value('JAmount')) + '\t';
            }

            txtFile += '\t';
            txtFile += '\t';
            txtFile += formatDate(Banana.Converter.toDate(tRow.value('JDate'))) +'\t';
            txtFile += tRow.value('JAmountTransactionCurrency') +'\t';
            txtFile += tRow.value('JTransactionCurrency') +'\n';
        }
    }
    return txtFile;
}

/* Function that format the date YYYYMMDD */
function formatDate(date) {
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    var mm = m < 10 ? '0' + m : m;
    var dd = d < 10 ? '0' + d : d;
    return '' + y + mm + dd;
}

/* Function that shows a dialog window for the period and let user to modify the parameters */
function settingsDialog() {

    var scriptform = {};
    
    // Retrieve saved param
    var savedParam = Banana.document.getScriptSettings();
    if (savedParam && savedParam.length > 0) {
        scriptform = JSON.parse(savedParam);
    }

    //We take the accounting "starting date" and "ending date" from the document. These will be used as default dates
    var docStartDate = Banana.document.startPeriod();
    var docEndDate = Banana.document.endPeriod();   
    
    //A dialog window is opened asking the user to insert the desired period. By default is the accounting period
    var selectedDates = Banana.Ui.getPeriod("Fichiers des écritures comptables (FEC)", docStartDate, docEndDate, 
        scriptform.selectionStartDate, scriptform.selectionEndDate, scriptform.selectionChecked);
        
    //We take the values entered by the user and save them as "new default" values.
    //This because the next time the script will be executed, the dialog window will contains the new values.
    if (selectedDates) {
        scriptform["selectionStartDate"] = selectedDates.startDate;
        scriptform["selectionEndDate"] = selectedDates.endDate;
        scriptform["selectionChecked"] = selectedDates.hasSelection;    
    } else {
        //User clicked cancel
        return null;
    }

    if (scriptform) {
        var paramToString = JSON.stringify(scriptform);
        Banana.document.setScriptSettings(paramToString);
    }

    return scriptform;
}
