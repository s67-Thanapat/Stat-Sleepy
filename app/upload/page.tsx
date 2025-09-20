'use client';
import { useState } from 'react';

export default function UploadPage(){
  const [file, setFile] = useState<File|null>(null);
  const [url, setUrl] = useState('');

  async function uploadCSV(){
    if(!file) return alert('เลือกไฟล์ก่อน');
    const text = await file.text();
    const res = await fetch('/api/ingest', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ mode:'csv', text })
    });
    const j = await res.json();
    if(!j.ok) return alert('Error: ' + j.error);
    alert(`นำเข้าแล้ว: ${j.inserted} แถว`);
  }

  async function fetchURL(){
    if(!url) return;
    const res = await fetch('/api/ingest', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ mode:'url', url })
    });
    const j = await res.json();
    if(!j.ok) return alert('Error: ' + j.error);
    alert(`นำเข้าแล้ว: ${j.inserted} แถว`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">นำเข้าข้อมูลการนอน</h1>

      <div className="rounded-xl bg-white p-4 shadow space-y-2">
        <div className="font-semibold">อัปโหลด CSV</div>
        <input type="file" accept=".csv" onChange={e=>setFile(e.target.files?.[0] ?? null)} />
        <button onClick={uploadCSV} className="px-3 py-2 bg-black text-white rounded">อัปโหลด</button>
      </div>

      <div className="rounded-xl bg-white p-4 shadow space-y-2">
        <div className="font-semibold">ดึงจาก URL CSV</div>
        <input className="border p-2 rounded w-full" placeholder="https://example.com/sleep.csv" value={url} onChange={e=>setUrl(e.target.value)} />
        <button onClick={fetchURL} className="px-3 py-2 bg-black text-white rounded">ดึงและนำเข้า</button>
      </div>
    </div>
  );
}
