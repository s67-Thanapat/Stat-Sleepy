'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function SleepChart({ data }:{data:{date:string; hours:number}[]}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3"/>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="hours" strokeWidth={2}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
