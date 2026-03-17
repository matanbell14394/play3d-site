export default function OrdersPage() {
  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle"><span>◎</span> הזמנות</div>
          <div className="pline" />
        </div>
        <button className="btn btn-t btn-sm">+ הזמנה</button>
      </div>
      <div className="tabs">
        <div className="tab active">הכל</div>
        <div className="tab">ממתין</div>
        <div className="tab">בהדפסה</div>
        <div className="tab">מוכן</div>
        <div className="tab">נמסר</div>
        <div className="tab">בוטל</div>
      </div>
      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th>לקוח</th>
              <th>טלפון</th>
              <th>מוצר</th>
              <th>כמות</th>
              <th>מחיר</th>
              <th>סטטוס</th>
              <th>תאריך</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text3)', padding: 24 }}>
                אין הזמנות עדיין
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
