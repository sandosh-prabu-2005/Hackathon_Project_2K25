import type { HeatmapPoint } from "../types/crowd";

type Props = {
  points: HeatmapPoint[];
};

export function HeatmapSummary({ points }: Props) {
  return (
    <section className="card">
      <h2>Heatmap Buckets</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Center</th>
              <th>Total</th>
              <th>Critical</th>
              <th>Verified</th>
            </tr>
          </thead>
          <tbody>
            {points.slice(0, 20).map((point, index) => (
              <tr key={`${point.latitude}-${point.longitude}-${index}`}>
                <td>{point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}</td>
                <td>{point.count}</td>
                <td>{point.critical_count}</td>
                <td>{point.verified_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
