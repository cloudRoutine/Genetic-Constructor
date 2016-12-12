/*
 Copyright 2016 Autodesk,Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import InspectorRole from './InspectorRole';
import InspectorBlock from './InspectorBlock';
import InspectorProject from './InspectorProject';
import { _getFocused } from '../../selectors/focus';


import '../../styles/InspectorGroupInformation.css';

class InspectorGroupInformation extends Component {
  static propTypes = {
    readOnly: PropTypes.bool.isRequired,
    isAuthoring: PropTypes.bool.isRequired,
    forceIsConstruct: PropTypes.bool.isRequired,
    type: PropTypes.string.isRequired,
    focused: PropTypes.any.isRequired,
    orders: PropTypes.array.isRequired,
    overrides: PropTypes.object.isRequired,
    project: PropTypes.object,
    construct: PropTypes.object,
  };

  render() {
    const { focused, orders, overrides, type, readOnly, forceIsConstruct, isAuthoring, project, construct } = this.props;
    // inspect instances, or construct if no instance or project if no construct or instances
    let inspect;
    switch (type) {
    case 'role' :
      inspect = (<InspectorRole roleId={focused} readOnly/>);
      break;
    case 'project':
      inspect = (<InspectorProject instance={focused}
                                   orders={orders}
                                   readOnly={readOnly}/>);
      break;
    case 'construct':
    default:
      inspect = (<InspectorBlock instances={focused}
                                 overrides={overrides}
                                 orders={orders}
                                 readOnly={readOnly}
                                 isAuthoring={isAuthoring}
                                 project={project}
                                 construct={construct}
                                 forceIsConstruct={forceIsConstruct}/>);
      break;
    }

    return <div>{inspect}</div>;
  }
}

function mapStateToProps(state, props) {
  const { level, blockIds } = state.focus;
  const currentProject = state.projects[props.projectId];

  //delegate handling of focus state handling to selector
  const { type, readOnly, focused } = _getFocused(state, true, props.projectId);

  //handle overrides if a list option
  const overrides = {};
  if (type === 'option') {
    const blockId = state.focus.blockIds[0];
    const block = state.blocks[blockId];
    if (!!block) {
      Object.assign(overrides, {
        color: block.getColor(),
        role: block.getRole(false),
      });
    }
  }

  const forceIsConstruct = (level === 'construct') ||
    blockIds.some(blockId => currentProject.components.indexOf(blockId) >= 0);

  const isAuthoring = !!state.focus.constructId && state.blocks[state.focus.constructId].isAuthoring() && focused.length === 1 && type !== 'project' && !readOnly;

  const orders = Object.keys(state.orders)
  .map(orderId => state.orders[orderId])
  .filter(order => order.projectId === currentProject.id && order.isSubmitted())
  .sort((one, two) => one.status.timeSent - two.status.timeSent);

  return {
    type,
    readOnly,
    focused,
    forceIsConstruct,
    orders,
    overrides,
    isAuthoring,
  };
}

export default connect(mapStateToProps, {})(InspectorGroupInformation);
