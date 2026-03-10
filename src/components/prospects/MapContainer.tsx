'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MatchedBusiness } from '@/lib/types';
import { LeadScoreBadge } from './LeadScoreBadge';

// Fix Leaflet default icon issue in Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

interface MapContainerProps {
  businesses: MatchedBusiness[];
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export default function ProspectMapContainer({ businesses }: MapContainerProps) {
  const markersWithCoords = businesses.filter(
    (b) => b.latitude != null && b.longitude != null
  );

  return (
    <div className="rounded-md border overflow-hidden">
      <MapContainer
        center={[39.5, -105.0]}
        zoom={7}
        style={{ height: '500px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markersWithCoords.map((business) => (
          <Marker
            key={business.id}
            position={[business.latitude!, business.longitude!]}
            icon={defaultIcon}
          >
            <Popup>
              <div className="space-y-1 text-sm min-w-[180px]">
                <p className="font-bold text-base">{business.company_name}</p>
                {business.address && (
                  <p className="text-muted-foreground">
                    {business.address}
                    {business.city && `, ${business.city}`}
                    {business.state && `, ${business.state}`}
                    {business.zip && ` ${business.zip}`}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1">
                  <span className="text-muted-foreground">Ads Delivered:</span>
                  <span className="font-medium">{formatNumber(business.total_ads_delivered)}</span>
                  <span className="text-muted-foreground">Clicks:</span>
                  <span className="font-medium">{formatNumber(business.total_clicks)}</span>
                  <span className="text-muted-foreground">Touches:</span>
                  <span className="font-medium">{formatNumber(business.total_touches)}</span>
                </div>
                {business.lead_score != null && (
                  <div className="pt-1">
                    <LeadScoreBadge score={business.lead_score} />
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
