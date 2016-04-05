import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import invariant from 'invariant';
import { push } from 'react-router-redux';
import MenuBar from '../components/Menu/MenuBar';
import UserWidget from '../components/authentication/userwidget';
import RibbonGrunt from '../components/ribbongrunt';
import {
  projectCreate,
  projectAddConstruct,
  projectSave
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
  blockClone,
  blockRemoveComponent,
  blockAddComponent,
 } from '../actions/blocks';
 import {
   blockGetParents,
 } from '../selectors/blocks';
import { projectGetVersion } from '../selectors/projects';
import { undo, redo } from '../store/undo/actions';
import {
  uiShowGenBankImport,
  uiToggleDetailView,
 } from '../actions/ui';
import { inspectorToggleVisibility } from '..//actions/inspector';
import { inventoryToggleVisibility } from '..//actions/inventory';
import { setItem } from '../middleware/localStorageCache';
import { uiShowDNAImport } from '../actions/ui';

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
  };

  state = {
    showAddProject: false,
    recentProjects: [],
  };

  /**
   * get the given blocks index in its parent
   */
  blockGetIndex(blockId) {
    // get parent
    const parentBlock = this.blockGetParent(blockId);
    invariant(parentBlock, 'expected a parent');
    const index = parentBlock.components.indexOf(blockId);
    invariant(index >= 0, 'expect the block to be found in components of parent');
    return index;
  }
  /**
   * get parent block of block with given id
   */
  blockGetParent(blockId) {
    const parentId = this.props.blockGetParents(blockId)[0];
    const parentBlock = this.props.blocks[parentId];
    return parentBlock;
  }
  /**
   * truthy if the block has a parent
   */
  blockHasParent(blockId) {
    return this.props.blockGetParents(blockId).length;
  }

  /**
   * true index is string representation of length of the path of the given block back to root.
   * e.g. if the block is the 4th child of a 2nd child of a 5th child its true index would be 4/1/3
   * Positioning the oldest ancester closest to the start of the string facilitates comparison.
   */
  getBlockTrueIndex(blockId) {
    let str = '';
    let current = blockId;
    while (this.blockHasParent(current)) {
      str = `${this.blockGetIndex(current)}${str.length ? '/' : ''}${str}`;
      current = this.blockGetParent(current).id;
    }
    return str;
  }

  /**
   * compare two results from getBlockTrueIndex, return truthy is a >= b
   */
  compareTrueIndices(tia, tib) {
    const tiav = tia.split('/').map(str => parseFloat(str));
    const tibv = tib.split('/').map(str => parseFloat(str));
    let i = 0;
    while (true) {
      if (tiav[i] === tibv[i] && i < tiav.length && i < tibv.length) {
        i++;
      } else {
        break;
      }
    }
    // this works because for each if the two paths are 2/3/2 and 2/3
    // the final compare of 2 >= null will return true
    // and also null >= null is true
    return tiav[i] >= tibv[i];
  }

  /**
   * return the block we are going to insert after
   */
  findInsertBlock() {
    // get true indices of all the focused blocks
    const trueIndices = this.props.focus.blocks.map(block => this.getBlockTrueIndex(block));
    trueIndices.sort(this.compareTrueIndices);
    // the highest index/path will be the last item
    const highest = trueIndices.pop();
    // now locate the block and returns its parent id
    // and the index to start inserting at
    let current = this.props.focus.construct;
    let indices = highest.split('/').map(index => parseFloat(index));
    let index = 0;
    let blockIndex = -1;
    let blockParent = null;
    do {
      blockIndex = indices[index];
      blockParent = current;
      current = this.props.blocks[current].components[blockIndex];
    } while (++index < indices.length);
    // return index + 1 to make the insert occur after this block
    return {
      parent: blockParent,
      blockIndex: blockIndex + 1,
    };
  }

  // copy the focused blocks to the clipboard using a deep clone
  copyFocusedBlocksToClipboard() {
    if (this.props.focus.blocks.length) {
      const clones = this.props.focus.blocks.map(block => {
        return this.props.blockClone(block, this.props.currentProjectId);
      });
      this.props.clipboardSetData([clipboardFormats.blocks], [clones])
    }
  }

  // get parent of block
  getBlockParentId(blockId) {
    return this.props.blockGetParents(blockId)[0];
  }

  // cut focused blocks to the clipboard, no clone required since we are removing them.
  cutFocusedBlocksToClipboard() {
    // copy the focused blocks before removing
    const blocks = this.props.focus.blocks.slice().map(blockId => this.props.blocks[blockId]);
    this.props.focus.blocks.forEach(blockId => {
      this.props.blockRemoveComponent(this.getBlockParentId(blockId), blockId);
    });
    this.props.clipboardSetData([clipboardFormats.blocks], [blocks])
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
        return this.props.blockClone(block.id, this.props.currentProjectId);
      });
      // insert at end of construct if no blocks selected
      let insertIndex = construct.components.length;
      let parentId = construct.id;
      if (this.props.focus.blocks.length) {
        const insertInfo = this.findInsertBlock();
        insertIndex = insertInfo.blockIndex;
        parentId = insertInfo.parent;
      }
      // add to construct
      clones.forEach(block => {
        this.props.blockAddComponent(parentId, block.id, insertIndex++);
      });
      // select the clones
      this.props.focusBlocks(clones.map(block => block.id));
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
              action: () => {
                this.props.projectSave(this.props.currentProjectId);
                setItem('mostRecentProject', this.props.currentProjectId);
              },
            },
            {},
            {
              text: 'New Project',
              action: () => {
                const project = this.props.projectCreate();
                this.props.push(`/project/${project.id}`);
              },
            }, {
              text: 'New Construct',
              action: () => {
                const block = this.props.blockCreate();
                this.props.projectAddConstruct(this.props.currentProjectId, block.id);
                this.props.focusConstruct(block.id);
              },
            }, {
              text: 'New Construct from Clipboard',
              action: () => {},
            }, {
              text: 'New Instance',
              action: () => {},
            }, {}, {
              text: 'Invite Collaborators',
              action: () => {},
            }, {
              text: 'Upload Genbank File',
              action: () => {
                this.props.uiShowGenBankImport(true);
              },
            }, {
              text: 'Download Genbank File',
              action: () => {},
            }, {
              text: 'Export PDF',
              action: () => {},
            }, {}, {
              text: 'Publish to Gallery',
              action: () => {},
            },
          ],
        },
        {
          text: 'EDIT',
          items: [
            {
              text: 'Undo',
              action: () => {
                this.props.undo();
              },
            }, {
              text: 'Redo',
              action: () => {
                this.props.redo();
              },
            }, {}, {
              text: 'Cut',
              disabled: !this.props.focus.blocks.length,
              action: () => {
                this.cutFocusedBlocksToClipboard();
              },
            }, {
              text: 'Copy',
              disabled: !this.props.focus.blocks.length,
              action: () => {
                this.copyFocusedBlocksToClipboard();
              },
            }, {
              text: 'Paste',
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
              text: 'Import DNA',
              action: () => {
                this.props.uiShowDNAImport(true);
              },
            }, {}, {
              text: 'Convert to List',
              action: () => {},
            }, {
              text: 'Convert to Construct',
              action: () => {},
            },
          ],
        },
        {
          text: 'VIEW',
          items: [
            {
              text: 'Inventory',
              checked: this.props.inventory,
              action: this.props.inventoryToggleVisibility
            }, {
              text: 'Inspector',
              checked: this.props.inspector,
              action: this.props.inspectorToggleVisibility,
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
            },
          ],
        },
        {
          text: 'HELP',
          items: [
            {
              text: 'User Guide',
              action: () => {},
            }, {
              text: 'Show Tutorial',
              action: () => {},
            }, {
              text: 'Keyboard Shortcuts',
              action: () => {},
            }, {
              text: 'Community Forum',
              action: () => {},
            }, {
              text: 'Get Support',
              action: () => {},
            }, {
              text: 'Give Us Feedback',
              action: () => {},
            }, {}, {
              text: 'About Genome Designer',
              action: () => {},
            }, {
              text: 'Terms of Use',
              action: () => {},
            }, {
              text: 'Privacy Policy',
              action: () => {},
            },
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
    inspector: state.inspector.isVisible,
    inventory: state.inventory.isVisible,
  };
}

export default connect(mapStateToProps, {
  projectAddConstruct,
  projectCreate,
  projectSave,
  projectGetVersion,
  blockCreate,
  blockClone,
  inspectorToggleVisibility,
  inventoryToggleVisibility,
  blockRemoveComponent,
  blockGetParents,
  uiShowDNAImport,
  undo,
  redo,
  push,
  uiShowGenBankImport,
  uiToggleDetailView,
  focusBlocks,
  focusBlocksAdd,
  focusBlocksToggle,
  focusConstruct,
  clipboardSetData,
  blockAddComponent,
})(GlobalNav);
