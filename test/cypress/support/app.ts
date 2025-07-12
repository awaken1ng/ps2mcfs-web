const newCard = () => {
  cy.log('creating new card')
  cy.dataCy('toolbar-vmc-new').click()
}

const openCardFromFixtures = (path: string) => {
  cy.log(`opening card ${path}`)
  const fullPath = `${Cypress.config('fixturesFolder')}/${path}`
  cy.dataCy('toolbar-vmc-open-input').selectFile(fullPath, { force: true })
}

const saveCardWithoutEcc = () => {
  cy.log('saving card without ECC')
  cy.dataCy('toolbar-vmc-saveAs').click()
  cy.dataCy('dialog-vmc-save-withoutEcc').click()
}

const saveCardWithEcc = () => {
  cy.log('saving card with ECC')
  cy.dataCy('toolbar-vmc-saveAs').click()
  cy.dataCy('dialog-vmc-save-withoutEcc').find('.q-btn-dropdown__arrow-container').click()
  cy.dataCy('dialog-vmc-save-withEcc').click()
}

const closeCard = () => {
  cy.log('closing card')
  cy.dataCy('toolbar-vmc-close').click()
}

const openImportFilesDialog = () => {
  cy.log('opening import files dialog')
  cy.dataCy('toolbar-import-files').click()
}

const addFileToImportFromFixtures = (path: string) => {
  cy.log(`adding ${path} to import`)
  const fullPath = `${Cypress.config('fixturesFolder')}/${path}`
  cy.dataCy('toolbar-import-files-input').selectFile(fullPath, { force: true })
}

const addFileToImportFromFixturesWithDragNDrop = (path: string) => {
  cy.log(`drag & dropping ${path} to import`)
  const fullPath = `${Cypress.config('fixturesFolder')}/${path}`
  cy.get('#q-app').selectFile(fullPath, { action: 'drag-drop', force: true })
}

const importFiles = () => {
  cy.log('importing files')
  cy.dataCy('dialog-import-files-import').click()
}

const importPsuFromFixturesWithoutOverwrite = (path: string) => {
  cy.log(`opening psu ${path} without overwrite`)
  const fullPath = `${Cypress.config('fixturesFolder')}/${path}`
  cy.dataCy('toolbar-import-psu-input').selectFile(fullPath, { force: true })
  cy.dataCy('dialog-import-psu-withoutOverwite').click()
}

const importPsuFromFixturesWithOverwrite = (path: string) => {
  cy.log(`opening psu ${path} with overwrite`)
  const fullPath = `${Cypress.config('fixturesFolder')}/${path}`
  cy.dataCy('toolbar-import-psu-input').selectFile(fullPath, { force: true })
  cy.dataCy('dialog-import-psu-withoutOverwite').click().find('.q-btn-dropdown__arrow-container').click()
  cy.dataCy('dialog-import-psu-withOverwite').click()
}

const mkdir = (name: string, nested = false) => {
  cy.log(`creaing new directory ${name}`)
  if (nested) cy.location('href').then(href => cy.visit(href + '?allowCreatingSubdirectories'))

  cy.dataCy('toolbar-mkdir').click()
  cy.withinDialog(() => {
    cy.contains('New directory name:')
    cy.focused().type(name)
    cy.get('button').contains('Create').click()
  })

  // ensure the created directory is in the item list
  getEntryByName(name).should('exist')

  if (nested) cy.go('back') // clear the QS
}

const fileName = () => cy.dataCy('toolbar-vmc-fileName')

const toggleSelection = () => cy.dataCy('toolbar-selectionToggle').click()

const getEntryByName = (name: string) => {
  cy.log(`get entry name ${name}`)
  return cy.dataCy('entry-name').contains(name)
}

const getEntry = (name: string) => {
  cy.log(`get entry ${name}`)
  return getEntryByName(name).parents('[data-cy=entry]')
}

const expectEntryToBeSelected = (name: string) => {
  cy.log(`entry ${name} should be selected`)
  getEntry(name).should('have.class', 'q-item--active')
}

const expectEntryToBeNotSelected = (name: string) => {
  cy.log(`entry ${name} should not be selected`)
  getEntry(name).should('not.have.class', 'q-item--active')
}

const toggleEntrySelection = (name: string) => {
  cy.log(`toggle entry selection ${name}`)
  getEntry(name).dataCy('entry-icon').click()
}

const openEntryMenu = (name: string) => {
  cy.log(`open entry menu ${name}`)
  // force to still open the menu e.g. if its obscured by another menu
  getEntry(name).dataCy('entry-menu-open').click({ force: true })
  expectEntryMenuToBeOpen()
}

const exportEntryAsPsuFromMenu = (name: string) => {
  cy.log(`exporting ${name} from menu`)
  openEntryMenu(name)
  cy.dataCy('entry-menu-exportPsu').click()
  expectEntryMenuToBeClosed()

  cy.withinDialog(() => {
    cy.get('button').contains('OK').click()
  })
}

const exportEntryAsZipFromMenu = (name: string) => {
  cy.log(`exporting ${name} as .zip from menu`)
  openEntryMenu(name)
  cy.dataCy('entry-menu-exportZip').click()
  expectEntryMenuToBeClosed()

  cy.withinDialog(() => {
    cy.get('button').contains('OK').click()
  })
}

const saveEntryFromMenu = (name: string) => {
  cy.log(`saving ${name} from menu`)
  openEntryMenu(name)
  cy.dataCy('entry-menu-saveFile').click()
  expectEntryMenuToBeClosed()
}

const deleteEntryFromMenu = (name: string) => {
  cy.log(`deleting ${name} from menu`)
  openEntryMenu(name)
  cy.dataCy('entry-menu-delete').click()
  expectEntryMenuToBeClosed()
  cy.withinDialog(() => {
    cy.contains('Delete')
    cy.get('button').contains('OK').click()
  })
}

const renameEntryFromMenu = (name: string, newName: string) => {
  cy.log(`renaming ${name} from menu`)
  openEntryMenu(name)
  cy.dataCy('entry-menu-rename').click()
  expectEntryMenuToBeClosed()
  cy.withinDialog(() => {
    cy.contains(/Rename directory|Rename file/)
    cy.focused().clear().type(newName)
    cy.get('button').contains('Rename').click()
  })
}

const expectEntryMenuToBeOpen = () => {
  cy.log('menu should be open')
  cy.dataCy('entry-menu').should('exist')
}

const expectEntryMenuToBeClosed = () => {
  cy.log('menu should be closed')
  cy.dataCy('entry-menu').should('not.exist')
}

const expectUnsavedChanges = () => {
  cy.log('should have unsaved changes')
  cy.get('.q-dialog').contains('Unsaved changes')
  cy.get('.q-dialog').contains('OK').click()
}

export default {
  newCard,
  openCardFromFixtures,
  saveCardWithoutEcc,
  saveCardWithEcc,
  closeCard,

  openImportFilesDialog,
  addFileToImportFromFixtures,
  addFileToImportFromFixturesWithDragNDrop,
  importFiles,
  importPsuFromFixturesWithoutOverwrite,
  importPsuFromFixturesWithOverwrite,
  mkdir,

  fileName,
  toggleSelection,

  entry: getEntry,
  entryByName: getEntryByName,
  entrySelect: toggleEntrySelection,
  entryMenu: openEntryMenu,
  exportEntryAsPsuFromMenu,
  exportEntryAsZipFromMenu,
  saveEntryFromMenu,
  deleteEntryFromMenu,
  renameEntryFromMenu,

  expectEntryToBeSelected,
  expectEntryToBeNotSelected,
  expectEntryMenuToBeOpen,
  expectEntryMenuToBeClosed,
  expectUnsavedChanges,
}
