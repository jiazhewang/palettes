import React from 'react';
import _ from 'lodash';
import chroma from 'chroma-js';
import {
  Form,
  Icon,
  Radio,
  Slider,
} from 'antd'
import getPaletteByColorRange from '../util/palette-by-range';
import { COLOR_RANGE } from '../constants';

const RANGE = _.merge({}, COLOR_RANGE, {
  // for interpolate
  lab: {
    l: [30, 100],
  },
  hsl: {
    h: [0, 180],
  },
  hcl: {
    h: [0, 180],
  },
});

function one2two(color, mode, component) {
  const components = chroma(color)[mode]();
  const index = mode.indexOf(component);
  const c1 = components.concat([]);
  const c2 = components.concat([]);
  // TODO
  const start = RANGE[mode][component][0];
  const end = RANGE[mode][component][1];
  const step = (end - start) / 100;
  c1[index] = start + step;
  c2[index] = end - step;
  return [chroma[mode](...c1).hex(), chroma[mode](...c2).hex()];
}

const COLOR_SPACES = [
  'rgb',
  'hsl',
  'lab',
  'hcl',
];

class GradientPaletteBy1 extends React.Component {
  state = {
    mode: 'hsl',
    currentComponent: 'l',
    colorsCount: 10,
  }

  render() {
    const { color, colors } = this.props;
    const onPaletteSelect = this.props.onPaletteSelect || function() {};
    const { mode, currentComponent, colorsCount } = this.state;
    const components = mode.split('');
    const paletteByOne = getPaletteByColorRange(one2two(color, mode, currentComponent), mode, colorsCount);
    const palettes = [];
    colors.map(c => {
      palettes.push(getPaletteByColorRange(one2two(c, mode, currentComponent), mode, colorsCount));
    });
    return <div>
      <Form layout="inline">
        <Form.Item label="Mode">
          <Radio.Group defaultValue={mode} onChange={(e) => {
            const currentMode = e.target.value;
            this.setState({
              mode: currentMode,
              currentComponent: currentMode.split('')[0], 
            })
          }}>
            {
              COLOR_SPACES.map((cs, i) => <Radio.Button key={i} value={cs}>{_.toUpper(cs)}</Radio.Button>)
            }
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Scale by">
          <Radio.Group key={currentComponent} defaultValue={currentComponent} onChange={(e) => {
            this.setState({
              currentComponent: e.target.value,
            })
          }}>
            {
              components.map((c, i) => <Radio.Button key={i} value={c}>{_.toUpper(c)}</Radio.Button>)
            }
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Count">
          <Slider min={2} max={40} value={colorsCount} style={{ width: 120 }}
            onChange={(value) => {
              this.setState({ colorsCount: value })
            }}/>
        </Form.Item>
      </Form>
      <div className="ant-table ant-table-small" style={{ marginTop: 24 }}>
        <div className="ant-table-content">
          <div className="ant-table-body" style={{ margin: 0 }}>
            <table style={{ fontFamily: 'Monospace' }}>
              <tbody className="ant-table-tbody">
                <tr>
                  <td key={`0-${color}`} style={{ background: color, border: '2px solid white' }}>{colors.length > 10? '##' : '#'} {color}</td>
                  <td key="0-0" style={{ border: '2px solid white' }}>
                    <Icon type="plus-circle" theme="twoTone" twoToneColor="#f00" onClick={() => {
                      onPaletteSelect(paletteByOne);
                    }}/>
                  </td>
                  {paletteByOne.map((c, i) => <td key={`${i}-${c}`} style={{ background: c, border: '2px solid white' }}>
                    &nbsp;
                  </td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="ant-table ant-table-small" style={{ marginTop: 24 }}>
        <div className="ant-table-content">
          <div className="ant-table-body" style={{ margin: 0 }}>
            <table style={{ fontFamily: 'Monospace' }}>
              <tbody className="ant-table-tbody">
                {
                  palettes.map((p, i) => <tr>
                    <td key={`0-${colors[i]}`} style={{ background: colors[i], border: '2px solid white' }}>{i} {colors[i]}</td>
                    <td key={`${i}-0`} style={{ border: '2px solid white' }}>
                      <Icon type="plus-circle" theme="twoTone" twoToneColor="#f00" onClick={() => {
                        onPaletteSelect(p);
                      }}/>
                    </td>
                    {p.map((c, i) => <td key={`${i}-${c}`} style={{ background: c, border: '2px solid white' }}>
                      &nbsp;
                    </td>)}
                  </tr>)
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  }
}

export default GradientPaletteBy1;
