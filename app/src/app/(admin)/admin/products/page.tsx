export default function ProductsPage() {
  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle"><span>⬡</span> מוצרים</div>
          <div className="pline" />
        </div>
        <button className="btn btn-t btn-sm">+ מוצר</button>
      </div>
      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th>שם</th>
              <th>אצווה</th>
              <th>שעות הדפסה</th>
              <th>עלות יח&apos;</th>
              <th>מחיר סופי</th>
              <th>מארקאפ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text3)', padding: 24 }}>
                אין מוצרים עדיין
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
