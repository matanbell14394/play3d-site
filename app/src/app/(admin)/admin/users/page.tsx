export default function UsersPage() {
  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle"><span>👥</span> משתמשים</div>
          <div className="pline" />
        </div>
      </div>
      <div className="sg">
        <div className="sc"><div className="slbl">סה&quot;כ משתמשים</div><div className="sval">—</div></div>
        <div className="sc pk"><div className="slbl">אדמינים</div><div className="sval">—</div></div>
      </div>
      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th>שם</th>
              <th>אימייל</th>
              <th>תפקיד</th>
              <th>נוצר</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 24 }}>
                אין משתמשים עדיין
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
