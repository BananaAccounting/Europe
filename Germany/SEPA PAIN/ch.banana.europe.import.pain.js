// @id = ch.banana.europe.import.pain
// @api = 1.0
// @pubdate = 2019-07-22
// @publisher = Bernhard Fürst, fuerstnet GmbH
// @description = SEPA PAIN.001 Credit Transactions (ISO 20022)
// @description.de = SEPA PAIN.001 Zahlungsanweisungen (ISO 20022)
// @doctype = *
// @docproperties =
// @task = import.transactions
// @outputformat = transactions.simple
// @inputdatasource = openfiledialog
// @inputencoding = utf8
// @inputfilefilter = Transactions as SEPA PAIN.001 - ISO 20022 (*.xml);;All files (*.*)
// @inputfilefilter.de = Zahlungsanweisungen als SEPA PAIN.001 - ISO 20022 (*.xml);;All files (*.*)

  // Convert SEPA PAIN.001 to array of array.
function exec(xml) {
  var transactions = [];

  const xmlFile = Banana.Xml.parse(xml);
  const xmlns = xmlFile.firstChildElement('Document')
    .attribute('xmlns');

  // Check if file is of format PAIN.001 (credit transactions).
  const creditTransfers = xmlns.search('pain.001') > 0 ? true : false;
  if (!creditTransfers) {
    Banana.application.addMessage('Document does not contain Credit Transactions (SEPA PAIN.001).');
    return false;
  }

  // Get to the element containing transactions.
  const pmtInf = xmlFile.firstChildElement('Document')
    .firstChildElement('CstmrCdtTrfInitn')
    .firstChildElement('PmtInf');

  // Date of transactions.
  const date = Banana.Converter.toLocaleDateFormat(pmtInf.firstChildElement('ReqdExctnDt').text);

  var expense = 0;
  var creditorName = '';
  var description = '';

  // Loop through the transactions.
  var transactionNode = pmtInf.firstChildElement('CdtTrfTxInf');
  while (transactionNode) {
    expense = transactionNode.firstChildElement('Amt').text;
    creditorName = transactionNode.firstChildElement('Cdtr').text;
    // Format for the description is: creditor name / transaction text.
    description = '"' + creditorName + ' / ' + transactionNode.firstChildElement('RmtInf').text + '"';

    transactions.push([date, description, '', expense]);

    // Next transaction.
    transactionNode = transactionNode.nextSiblingElement('CdtTrfTxInf');
  }

  // Converts a table (array of array) to a tsv file (tabulator separated values)
  var tsvFile = Banana.Converter.arrayToTsv(transactions);

  // Return the converted tsv file
  return tsvFile;
}