import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import invariant from 'invariant';
import { push } from 'react-router-redux';
import MenuBar from '../components/Menu/MenuBar';
import UserWidget from '../components/authentication/userwidget';
import RibbonGrunt from '../components/ribbongrunt';
import {
  projectCreate,
  projectAddConstruct,
  projectSave,
} from '../actions/projects';
import {
  focusBlocks,
  focusBlocksAdd,
  focusBlocksToggle,
  focusConstruct,
} from '../actions/focus';
import { clipboardSetData } from '../actions/clipboard';
import * as clipboardFormats from '../constants/clipboardFormats';
import {
  blockCreate,
  blockDelete,
  blockDetach,
  blockClone,
  blockRemoveComponent,
  blockAddComponent,
  blockAddComponents,
  blockRename,
} from '../actions/blocks';
import {
  blockGetParents,
  blockGetChildrenRecursive,
} from '../selectors/blocks';
import { projectGetVersion } from '../selectors/projects';
import { undo, redo, transact, commit } from '../store/undo/actions';
import {
  uiShowGenBankImport,
  uiToggleDetailView,
  uiSetGrunt,
 } from '../actions/ui';
import { inspectorToggleVisibility } from '../actions/inspector';
import { inventoryToggleVisibility } from '../actions/inventory';
import { uiShowDNAImport } from '../actions/ui';

import KeyboardTrap from 'mousetrap';
import {
  microsoft,
  apple,
  stringToShortcut,
  translate,
} from '../utils/ui/keyboard-translator';
import {
  sortBlocksByIndexAndDepth,
  sortBlocksByIndexAndDepthExclude,
  domSummary,
} from '../utils/ui/uiapi';
import AutosaveTracking from '../components/GlobalNav/AutosaveTracking';

import '../styles/GlobalNav.css';

class GlobalNav extends Component {
  static propTypes = {
    undo: PropTypes.func.isRequired,
    redo: PropTypes.func.isRequired,
    push: PropTypes.func.isRequired,
    projectCreate: PropTypes.func.isRequired,
    projectAddConstruct: PropTypes.func.isRequired,
    projectSave: PropTypes.func.isRequired,
    currentProjectId: PropTypes.string,
    blockCreate: PropTypes.func.isRequired,
    showMainMenu: PropTypes.bool.isRequired,
    blockGetParents: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    // keyboard shortcuts
    //
    // ************ FILE MENU ***********
    KeyboardTrap.bind('mod+s', (evt) => {
      evt.preventDefault();
      this.saveProject();
    });
    KeyboardTrap.bind('ctrl+n', (evt) => {
      evt.preventDefault();
      this.newProject();
    });
    KeyboardTrap.bind('shift+ctrl+n', (evt) => {
      evt.preventDefault();
      this.newConstruct();
    });
    // ************ EDIT MENU ***********
    KeyboardTrap.bind('mod+z', (evt) => {
      evt.preventDefault();
      this.props.undo();
    });
    KeyboardTrap.bind('mod+shift+z', (evt) => {
      evt.preventDefault();
      this.props.redo();
    })
    // select all/cut/copy/paste
    KeyboardTrap.bind('mod+a', (evt) => {
      evt.preventDefault();
      this.onSelectAll();
    });
    KeyboardTrap.bind('mod+x', (evt) => {
      evt.preventDefault();
      this.cutFocusedBlocksToClipboard();
    });
    KeyboardTrap.bind('mod+c', (evt) => {
      evt.preventDefault();
      this.copyFocusedBlocksToClipboard();
    });
    KeyboardTrap.bind('mod+v', (evt) => {
      evt.preventDefault();
      this.pasteBlocksToConstruct();
    });
    // **************** VIEW ******************
    KeyboardTrap.bind('shift+mod+i', (evt) => {
      evt.preventDefault();
      this.props.inventoryToggleVisibility();
    });
    KeyboardTrap.bind('mod+i', (evt) => {
      evt.preventDefault();
      this.props.inspectorToggleVisibility();
    });
  }

  state = {
    showAddProject: false,
    recentProjects: [],
  };

  /**
   * select all blocks of the current construct
   */
  onSelectAll() {
    this.props.focusBlocks(this.props.blockGetChildrenRecursive(this.props.focus.construct).map(block => block.id));
  }

  /**
   * save current project and signal this as the most recent project to reopen
   */
  saveProject() {
    this.props.projectSave(this.props.currentProjectId);
  }

  /**
   * new project and navigate to new project
   */
  newProject() {
    // create project and add a default construct
    const project = this.props.projectCreate();
    // add a construct to the new project
    const block = this.props.blockCreate();
    this.props.blockRename(block.id, "New Construct");
    this.props.projectAddConstruct(project.id, block.id);
    this.props.focusConstruct(block.id);
    this.props.push(`/project/${project.id}`);
  }

  /**
   * add a new construct to the current project
   */
  newConstruct() {
    this.props.transact();
    const block = this.props.blockCreate();
    this.props.blockRename(block.id, "New Construct");
    this.props.projectAddConstruct(this.props.currentProjectId, block.id);
    this.props.commit();
    this.props.focusConstruct(block.id);
  }

  /**
   * download the current file as a genbank file
   * @return {[type]} [description]
   */
  downloadProjectGenbank() {
    // for now use an iframe otherwise any errors will corrupt the page
    const url = `${window.location.protocol}//${window.location.host}/export/genbank/${this.props.currentProjectId}`;
    var iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    document.body.appendChild(iframe);
  }

  /**
   * get parent block of block with given id
   */
  blockGetParent(blockId) {
    return this.props.blockGetParents(blockId)[0];
  }

  /**
   * return the block we are going to insert after
   */
  findInsertBlock() {
    // sort blocks according to 'natural order'
    const sorted = sortBlocksByIndexAndDepth(this.props.focus.blocks);
    // the right most, top most block is the insertion point
    const highest = sorted.pop();
    // return parent of highest block and index + 1 so that the block is inserted after the highest block
    return {
      parent: this.blockGetParent(this.props.blocks[highest.blockId].id).id,
      index: highest.index + 1,
    };

    // now locate the block and returns its parent id and the index to start inserting at
    let current = this.props.focus.construct;
    let index = 0;
    let blockIndex = -1;
    let blockParent = null;
    do {
      blockIndex = highest[index].index;
      blockParent = current;
      current = this.props.blocks[current].components[blockIndex];
    } while (++index < highest.length);
    // return index + 1 to make the insert occur after the highest selected block
    return {
      parent: blockParent,
      blockIndex: blockIndex + 1,
    };
  }

  // copy the focused blocks to the clipboard using a deep clone
  copyFocusedBlocksToClipboard() {
    if (this.props.focus.blocks.length) {
      // sort selected blocks so they are pasted in the same order as they exist now.
      // NOTE: we don't copy the children of any selected parents since they will
      // be cloned along with their parent
      //const sorted = sortBlocksByIndexAndDepth(this.props.focus.blocks);
      const sorted = sortBlocksByIndexAndDepthExclude(this.props.focus.blocks);
      // sorted is an array of array, flatten while retaining order
      const clones = sorted.map(info => {
        return this.props.blockClone(info.blockId, this.props.projectGetVersion(this.props.currentProjectId));
      });
      // put clones on the clipboard
      this.props.clipboardSetData([clipboardFormats.blocks], [clones])
    }
  }

  /**
   * select all the empty blocks in the current construct
   */
  selectEmptyBlocks() {
    const allChildren = this.props.blockGetChildrenRecursive(this.props.focus.construct);
    const emptySet = allChildren.filter(block => !block.hasSequence()).map(block => block.id);
    this.props.focusBlocks(emptySet);
    if (!emptySet.length) {
      this.props.uiSetGrunt('There are no empty blocks in the current construct');
    }
  }

  // get parent of block
  getBlockParentId(blockId) {
    return this.props.blockGetParents(blockId)[0].id;
  }

  // cut focused blocks to the clipboard, no clone required since we are removing them.
  cutFocusedBlocksToClipboard() {
    if (this.props.focus.blocks.length) {
      const blockIds = this.props.blockDetach(...this.props.focus.blocks);
      this.props.clipboardSetData([clipboardFormats.blocks], [blockIds.map(blockId => this.props.blocks[blockId])]);
      this.props.focusBlocks([]);
    }
  }

  // paste from clipboard to current construct
  pasteBlocksToConstruct() {
    // paste blocks into construct if format available
    const index = this.props.clipboard.formats.indexOf(clipboardFormats.blocks);
    if (index >= 0) {
      const blocks = this.props.clipboard.data[index];
      invariant(blocks && blocks.length && Array.isArray(blocks), 'expected array of blocks on clipboard for this format');
      // get current construct
      const construct = this.props.blocks[this.props.focus.construct];
      invariant(construct, 'expected a construct');
      // we have to clone the blocks currently on the clipboard since they
      // can't be pasted twice
      const clones = blocks.map(block => {
        const version = this.props.projectGetVersion(this.props.currentProjectId);
        return this.props.blockClone(block.id, version);
      });
      // insert at end of construct if no blocks selected
      let insertIndex = construct.components.length;
      let parentId = construct.id;
      if (this.props.focus.blocks.length) {
        const insertInfo = this.findInsertBlock();
        insertIndex = insertInfo.index;
        parentId = insertInfo.parent;
      }
      // add to construct
      this.props.blockAddComponents(parentId, clones.map(clone => clone.id), insertIndex);

      // select the clones
      this.props.focusBlocks(clones.map(clone => clone.id));
    }
  }

  menuBar() {
    return (<MenuBar
      menus={[
        {
          text: 'FILE',
          items: [
            {
              text: 'Save Project',
              shortcut: stringToShortcut('meta S'),
              action: () => {
                this.saveProject();
              },
            },
            {},
            {
              text: 'New Project',
              shortcut: stringToShortcut('ctrl N'),
              action: () => {
                this.newProject();
              },
            }, {
              text: 'New Construct',
              shortcut: stringToShortcut('shift ctrl N'),
              action: () => {
                this.newConstruct();
              },
            }, {
              text: 'New Block',
              action: () => {},
            }, {}, {
              text: 'Upload Genbank File',
              action: () => {
                this.props.uiShowGenBankImport(true);
              },
            }, {
              text: 'Download Genbank File',
              action: () => {
                this.downloadProjectGenbank();
              },
            },
          ],
        },
        {
          text: 'EDIT',
          items: [
            {
              text: 'Undo',
              shortcut: stringToShortcut('meta z'),
              action: () => {
                this.props.undo();
              },
            }, {
              text: 'Redo',
              shortcut: stringToShortcut('shift meta z'),
              action: () => {
                this.props.redo();
              },
            }, {}, {
              text: 'Select All',
              shortcut: stringToShortcut('meta A'),
              disabled: !this.props.focus.construct,
              action: () => {
                this.onSelectAll();
              },
            }, {
              text: 'Cut',
              shortcut: stringToShortcut('meta X'),
              disabled: !this.props.focus.blocks.length,
              action: () => {
                this.cutFocusedBlocksToClipboard();
              },
            }, {
              text: 'Copy',
              shortcut: stringToShortcut('meta C'),
              disabled: !this.props.focus.blocks.length,
              action: () => {
                this.copyFocusedBlocksToClipboard();
              },
            }, {
              text: 'Paste',
              shortcut: stringToShortcut('meta V'),
              disabled: !this.props.clipboard.formats.includes(clipboardFormats.blocks),
              action: () => {
                this.pasteBlocksToConstruct();
              },
            }, {}, {
              text: 'Rename',
              action: () => {},
            }, {
              text: 'Duplicate',
              action: () => {},
            }, {
              text: 'Delete',
              action: () => {},
            }, {}, {
              text: 'Add Sequence',
              action: () => {
                if (!this.props.focus.blocks.length) {
                  this.props.uiSetGrunt('Sequence data must be added to or before a selected block. Please select a block and try again.');
                } else {
                  this.props.uiShowDNAImport(true);
                }
              },
            }, {
              text: 'Select Empty Blocks',
              disabled: !this.props.focus.construct,
              action: () => {
                this.selectEmptyBlocks();
              },
            },
          ],
        },
        {
          text: 'VIEW',
          items: [
            {
              text: 'Inventory',
              checked: this.props.inventory,
              action: this.props.inventoryToggleVisibility,
              shortcut: stringToShortcut('shift meta i'),
            }, {
              text: 'Inspector',
              checked: this.props.inspectorVisible,
              action: this.props.inspectorToggleVisibility,
              shortcut: stringToShortcut('meta i'),
            }, {
              text: 'Sequence Details',
              action: () => {
              },
              checked: false,
            }, {}, {
              text: 'Block Style',
              disabled: true,
            }, {
              text: 'Labels Only',
              checked: false,
            }, {
              text: 'Symbols Only',
              checked: false,
            }, {
              text: 'Labels + Symbols',
              checked: false,
            }, {}, {
              text: 'Select Empty Blocks',
              disabled: !this.props.focus.construct,
              action: () => {
                this.selectEmptyBlocks();
              },
            },
          ],
        },
        {
          text: 'HELP',
          items: [
            {
              text: 'DOM Summary',
              action: () => {
                domSummary();
              },
            }
          ],
        },
      ]}/>);
  }

  render() {
    return (
      <div className="GlobalNav">
        <RibbonGrunt />
        <span className="GlobalNav-title">GD</span>
        {this.props.showMainMenu ? this.menuBar() : null}
        <span className="GlobalNav-spacer" />
        <AutosaveTracking />
        <UserWidget/>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    showMainMenu: state.ui.showMainMenu,
    focus: state.focus,
    blocks: state.blocks,
    clipboard: state.clipboard,
    inspectorVisible: state.inspector.isVisible,
    inventoryVisible: state.inventory.isVisible,
  };
}

export default connect(mapStateToProps, {
  projectAddConstruct,
  projectCreate,
  projectSave,
  projectGetVersion,
  blockCreate,
  blockClone,
  blockDelete,
  blockDetach,
  blockRename,
  inspectorToggleVisibility,
  inventoryToggleVisibility,
  blockRemoveComponent,
  blockGetParents,
  blockGetChildrenRecursive,
  uiShowDNAImport,
  undo,
  redo,
  transact,
  commit,
  push,
  uiShowGenBankImport,
  uiToggleDetailView,
  uiSetGrunt,
  focusBlocks,
  focusBlocksAdd,
  focusBlocksToggle,
  focusConstruct,
  clipboardSetData,
  blockAddComponent,
  blockAddComponents,
})(GlobalNav);
