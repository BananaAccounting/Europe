# France Fichier FEC pour le contrôle fiscale

## Informations
* [Outil de test des fichiers des écritures comptables (FEC)](https://www.economie.gouv.fr/dgfip/outil-test-des-fichiers-des-ecritures-comptables-fec) Direction générale Finance publique
* [Format fichier impots.gouv.fr](http://bofip.impots.gouv.fr/bofip/9028-PGP)
* [Format fichier Legifrance](https://www.legifrance.gouv.fr/affichCodeArticle.do;jsessionid=1D905278ED63729D4CDF44E8064D8160.tpdila07v_3?idArticle=LEGIARTI000027804775&cidTexte=LEGITEXT000006069583&categorieLien=id&dateTexte=20150610)
* [compta-facile.com](http://www.compta-facile.com/fichier-des-ecritures-comptables-fec-definition-contenu-utilite/)

## Mouvements
* Il doit être généré dans un format particulier et doit comprendre l’ensemble des journaux existants dans la comptabilité de l’entreprise. Les écritures d’inventaires et les écritures d’à-nouveaux doivent donc également y figurer.
* Compte bClass 1, 2, 3, 4

## Champs
1. Le code journal de l'écriture comptable
	JournalCode, Alphanumérique  ("base")
2. Le libellé journal de l'écriture comptable
	JournalLib, Alphanumérique ("Transactions")
3. Le numéro sur une séquence continue de l'écriture comptable
	EcritureNumm, Alphanumérique (???)
4. La date de comptabilisation de l'écriture comptable
	EcritureDate, Date (JDate)
5. Le numéro de compte, dont les trois premiers caractères doivent correspondre à des chiffres respectant les normes du plan comptable français
	CompteNum, Alphanumérique (JAccount)
6. Le libellé de compte, conformément à la nomenclature du plan comptable français
	CompteLib, Alphanumérique (Account Description from table account)
7. Le numéro de compte auxiliaire (à blanc si non utilisé)
	CompAuxNum, Alphanumérique  (blanc)
8. Le libellé de compte auxiliaire (à blanc si non utilisé)
	CompAuxLib, Alphanumérique (blanc)
9. La référence de la pièce justificative
	PieceRef, Alphanumérique (Doc)
10. La date de la pièce justificative
	PieceDate, Date (DateOri)
11. Le libellé de l'écriture comptable
	EcritureLib, Alphanumérique (JDescription)
12. Le montant au débit
	Debit,Numérique  (JAmount if positive)
13. Le montant au crédit
	Credit, Numérique (abs(JAmount) if negative)
14. Le lettrage de l'écriture comptable (à blanc si non utilisé)
	EcritureLet,Alphanumérique (blanc)
15. La date de lettrage (à blanc si non utilisé)
	DateLet, Date (blanc)
16. La date de validation de l'écriture comptable
	ValidDate, Date (??)
17. Le montant en devise (à blanc si non utilisé)
	Montantdevise, Numérique (JAmountTransactionCurrency)
18. L'identifiant de la devise (à blanc si non utilisé)
	Idevise, Alphanumérique  (JTransactionCurrency)
	
	
