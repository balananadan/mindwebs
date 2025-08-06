'use client';

import React, { useState } from 'react';
import { 
  Card, 
  Collapse, 
  Button, 
  Select, 
  ColorPicker, 
  InputNumber, 
  List, 
  Popconfirm,
  Typography,
  Divider,
  Tag
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined,
  SettingOutlined 
} from '@ant-design/icons';
import { useMapStore, ColorRule, DataSource } from '@/store/useMapStore';

const { Panel } = Collapse;
const { Text } = Typography;

const ColorRuleEditor: React.FC<{
  dataSource: DataSource;
  onUpdate: (rules: ColorRule[]) => void;
}> = ({ dataSource, onUpdate }) => {
  const [newRule, setNewRule] = useState<Partial<ColorRule>>({
    operator: '<',
    value: 0,
    color: '#1890ff',
  });

  const operators = [
    { label: '=', value: '=' },
    { label: '<', value: '<' },
    { label: '>', value: '>' },
    { label: '≤', value: '<=' },
    { label: '≥', value: '>=' },
  ];

  const addRule = () => {
    if (newRule.operator && newRule.value !== undefined && newRule.color) {
      const rule: ColorRule = {
        id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        operator: newRule.operator as ColorRule['operator'],
        value: newRule.value,
        color: newRule.color,
      };
      
      onUpdate([...dataSource.colorRules, rule]);
      setNewRule({ operator: '<', value: 0, color: '#1890ff' });
    }
  };

  const deleteRule = (ruleId: string) => {
    onUpdate(dataSource.colorRules.filter(rule => rule.id !== ruleId));
  };

  const updateRule = (ruleId: string, updates: Partial<ColorRule>) => {
    onUpdate(
      dataSource.colorRules.map(rule =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Existing Rules */}
      <div>
        <Text strong>Color Rules</Text>
        <List
          size="small"
          dataSource={dataSource.colorRules}
          renderItem={(rule) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="delete"
                  title="Delete this rule?"
                  onConfirm={() => deleteRule(rule.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="text" size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              ]}
            >
              <div className="flex items-center space-x-2 w-full">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: rule.color }}
                />
                <Select
                  size="small"
                  value={rule.operator}
                  onChange={(value) => updateRule(rule.id, { operator: value as ColorRule['operator'] })}
                  options={operators}
                  style={{ width: 60 }}
                />
                <InputNumber
                  size="small"
                  value={rule.value}
                  onChange={(value) => updateRule(rule.id, { value: value || 0 })}
                  style={{ width: 80 }}
                />
                <ColorPicker
                  size="small"
                  value={rule.color}
                  onChange={(color) => updateRule(rule.id, { color: color.toHexString() })}
                />
              </div>
            </List.Item>
          )}
        />
      </div>

      {/* Add New Rule */}
      <div className="bg-gray-50 p-3 rounded">
        <Text strong className="block mb-2">Add New Rule</Text>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Select
              size = "small"
              value={newRule.operator}
              onChange={(value) => setNewRule({ ...newRule, operator: value as ColorRule['operator'] })}
              options={operators}
              style={{ width: 60 }}
            />
            <InputNumber
              size="small"
              value={newRule.value}
              onChange={(value) => setNewRule({ ...newRule, value: value || 0 })}
              placeholder="Value"
              style={{ width: 80 }}
            />
            <ColorPicker
              size="small"
              value={newRule.color}
              onChange={(color) => setNewRule({ ...newRule, color: color.toHexString() })}
            />
          </div>
          <Button 
            size="small" 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={addRule}
            disabled={!newRule.operator || newRule.value === undefined}
          >
            Add Rule
          </Button>
        </div>
      </div>
    </div>
  );
};

const PolygonList: React.FC = () => {
  const { polygons, deletePolygon, dataSources } = useMapStore();

  return (
    <Card title="Polygons" size="small">
      {polygons.length === 0 ? (
        <Text type="secondary">No polygons created yet</Text>
      ) : (
        <List
          size="small"
          dataSource={polygons}
          renderItem={(polygon) => {
            const dataSource = dataSources.find(ds => ds.id === polygon.dataSourceId);
            return (
              <List.Item
                actions={[
                  <Popconfirm
                    key="delete"
                    title="Delete this polygon?"
                    onConfirm={() => deletePolygon(polygon.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button type="text" size="small" icon={<DeleteOutlined />} />
                  </Popconfirm>
                ]}
              >
                <div className="flex items-center space-x-2 w-full">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: polygon.currentColor }}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{polygon.name}</div>
                    <div className="text-xs text-gray-500">
                      {dataSource?.name} • {polygon.currentValue ?? 'Loading...'}
                    </div>
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
};

const Sidebar: React.FC = () => {
  const { dataSources, updateDataSource } = useMapStore();

  const handleColorRulesUpdate = (dataSourceId: string, colorRules: ColorRule[]) => {
    updateDataSource(dataSourceId, { colorRules });
  };

  return (
    <div className="w-80 h-full bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <SettingOutlined className="mr-2" />
          Dashboard Controls
        </h2>

        <div className="space-y-4">
          {/* Data Sources Configuration */}
          <Card title="Data Sources" size="small">
            <Collapse
              size="small"
              items={dataSources.map((dataSource) => ({
                key: dataSource.id,
                label: (
                  <div className="flex items-center justify-between">
                    <span>{dataSource.name}</span>
                    <Tag color="blue">{dataSource.field}</Tag>
                  </div>
                ),
                children: (
                  <ColorRuleEditor
                    dataSource={dataSource}
                    onUpdate={(rules) => handleColorRulesUpdate(dataSource.id, rules)}
                  />
                ),
              }))}
            />
          </Card>

          <Divider />

          {/* Polygons List */}
          <PolygonList />

          <Divider />

          {/* Legend */}
          <Card title="Color Legend" size="small">
            {dataSources.map((dataSource) => (
              <div key={dataSource.id} className="mb-4">
                <Text strong className="block mb-2">{dataSource.name}</Text>
                <div className="space-y-1">
                  {dataSource.colorRules.map((rule) => (
                    <div key={rule.id} className="flex items-center space-x-2 text-sm">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: rule.color }}
                      />
                      <span>
                        {rule.operator} {rule.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>

          {/* Instructions */}
          <Card title="Instructions" size="small">
            <div className="text-xs space-y-2 text-gray-600">
                             <div>1. Use timeline slider to select time period</div>
               <div>2. Click &quot;Draw Polygon&quot; to create regions</div>
               <div>3. Configure color rules for data sources</div>
               <div>4. Polygons will update colors based on data</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;