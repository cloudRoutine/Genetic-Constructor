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

import '../../styles/InventoryTabs.css';

export default class InventoryTabs extends Component {
  static propTypes = {
    tabs: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string.isRequired,
    })).isRequired,
    onTabSelect: PropTypes.func.isRequired,
    activeTabIndex: PropTypes.number,
    activeTabKey: PropTypes.string,
  };

  render() {
    const { tabs, onTabSelect, activeTabKey, activeTabIndex } = this.props;

    return (
      <div className="InventoryTabs">
        {tabs.map((tab, index) => {
          const isActive = activeTabKey === tab.key || activeTabIndex === index;
          return (
            <a
              className={`InventoryTabs-tab${isActive ? ' active' : ''}`}
              key={tab.name}
              onClick={() => onTabSelect(tab, index)}
            >
              {tab.name}
            </a>
          );
        })}
      </div>
    );
  }
}
