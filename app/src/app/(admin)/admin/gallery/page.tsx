export default function GalleryPage() {
  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle"><span>▦</span> גלריה</div>
          <div className="pline" />
        </div>
        <button className="btn btn-t btn-sm">+ פרויקט</button>
      </div>
      <div className="gal-grid2">
        <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text3)', padding: 48, fontSize: 13 }}>
          אין פרויקטים בגלריה עדיין
        </div>
      </div>
    </div>
  );
}
