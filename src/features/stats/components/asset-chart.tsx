'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AssetHistoryPoint } from '../utils';

interface AssetChartProps {
  data: AssetHistoryPoint[];
  title?: string;
}

export function AssetChart({ data, title = '資産推移' }: AssetChartProps) {
  const chartId = useId().replace(/:/g, '');

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-sub flex h-[300px] items-center justify-center">データがありません</div>
        </CardContent>
      </Card>
    );
  }

  const balances = data.map((point) => point.balance);
  const dataMax = Math.max(...balances);
  const dataMin = Math.min(...balances);

  // 分割グラデーションはゼロを跨ぐときだけ使う。全点が同符号でオフセットが 1.0 や 0 に
  // 張り付くと、同一オフセットの後勝ち規則で境界の線分へ逆側の色が滲むため
  const crossesZero = dataMin < 0 && dataMax > 0;
  const off = crossesZero ? dataMax / (dataMax - dataMin) : 1;
  const solidColor = dataMax <= 0 ? 'var(--color-error)' : 'var(--color-primary)';

  // 取引が多いイベントでは全点ドットが団子になるため、点数が少ないときだけ描画する
  const showDots = data.length <= 30;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              {crossesZero && (
                <defs>
                  <linearGradient id={`${chartId}-splitColor`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset={off} stopColor="var(--color-primary)" stopOpacity={1} />
                    <stop offset={off} stopColor="var(--color-error)" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id={`${chartId}-splitFill`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset={off} stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset={off} stopColor="var(--color-error)" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
              )}
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-gray-200)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'var(--color-text-sub)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-gray-200)' }}
                minTickGap={48}
              />
              <YAxis
                tickFormatter={(value) => `¥${value.toLocaleString('ja-JP')}`}
                tick={{ fontSize: 12, fill: 'var(--color-text-sub)' }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <ReferenceLine y={0} stroke="var(--color-text-sub)" strokeDasharray="3 3" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    // SAFETY: この Tooltip は AssetHistoryPoint[] を data に持つチャート専用
                    const data = payload[0].payload as AssetHistoryPoint;
                    return (
                      <div className="rounded-control border border-gray-200 bg-white p-3 text-sm shadow-md">
                        <div className="text-text-sub text-sm">{data.date}</div>
                        <div className="mb-1 font-semibold text-gray-900">{data.label || '不明な操作'}</div>
                        <div className="flex flex-col gap-0.5 tabular-nums">
                          <div
                            className={`text-lg font-semibold ${
                              data.amount > 0 ? 'text-blue-600' : data.amount < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}
                          >
                            {data.amount > 0 ? '+' : ''}
                            {data.amount.toLocaleString('ja-JP')}円
                          </div>
                          <div className="text-sm text-gray-500">残高: {data.balance.toLocaleString('ja-JP')}円</div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke={crossesZero ? `url(#${chartId}-splitColor)` : solidColor}
                fill={crossesZero ? `url(#${chartId}-splitFill)` : solidColor}
                fillOpacity={crossesZero ? undefined : 0.3}
                strokeWidth={2}
                dot={
                  showDots
                    ? (props) => {
                        const { cx, cy, payload } = props;
                        const isPositive = payload.balance >= 0;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill={isPositive ? 'var(--color-primary)' : 'var(--color-error)'}
                            stroke={isPositive ? 'var(--color-primary)' : 'var(--color-error)'}
                            fillOpacity={1}
                            strokeWidth={1}
                          />
                        );
                      }
                    : false
                }
                activeDot={(props) => {
                  const { cx, cy, payload } = props;
                  const isPositive = payload.balance >= 0;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill={isPositive ? 'var(--color-primary)' : 'var(--color-error)'}
                      stroke="white"
                      strokeWidth={2}
                    />
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
