import React, { useEffect, useState } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Download, AlertCircle } from 'lucide-react';
import { locationService } from '../services/locationService';
import { trafficService } from '../services/trafficService';
import type { Location } from '../lib/supabase';

export const DataManagement: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    city: string;
    latitude: number;
    longitude: number;
    zone_type: 'residential' | 'commercial' | 'highway';
  }>({
    name: '',
    city: '',
    latitude: 0,
    longitude: 0,
    zone_type: 'commercial',
  });

  const zoneTypes: Array<'residential' | 'commercial' | 'highway'> = ['residential', 'commercial', 'highway'];

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const data = await locationService.getAll();
      setLocations(data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = () => {
    setFormData({
      name: '',
      city: '',
      latitude: 0,
      longitude: 0,
      zone_type: 'commercial',
    });
    setEditingId(null);
    setShowLocationForm(true);
  };

  const handleEditLocation = (location: Location) => {
    setFormData({
      name: location.name,
      city: location.city,
      latitude: location.latitude,
      longitude: location.longitude,
      zone_type: location.zone_type,
    });
    setEditingId(location.id);
    setShowLocationForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await locationService.update(editingId, formData);
      } else {
        await locationService.create(formData);
      }
      setShowLocationForm(false);
      loadLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Error saving location');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this location and all its traffic logs?')) return;
    try {
      await locationService.delete(id);
      loadLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Error deleting location');
    }
  };

  const handleExportData = async () => {
    try {
      const { data: allLogs } = await trafficService.getAll(10000, 0);
      const allLocations = await locationService.getAll();

      const locationMap = new Map(allLocations.map((loc: Location) => [loc.id, loc.name]));

      const csv = [
        ['Location', 'Timestamp', 'Density %', 'Vehicles', 'Status', 'Source'],
        ...allLogs.map((log) => [
          locationMap.get(log.location_id) || 'Unknown',
          new Date(log.timestamp).toLocaleString(),
          log.density_level,
          log.vehicle_count,
          log.congestion_status,
          log.data_source,
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `traffic-data-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Data Management</h1>
          <p className="text-slate-600">Manage locations and export traffic data</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 font-medium"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleAddLocation}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        </div>
      </div>

      {showLocationForm && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {editingId ? 'Edit Location' : 'New Location'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Zone Type</label>
                <select
                  value={formData.zone_type}
                  onChange={(e) => setFormData({ ...formData, zone_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                >
                  {zoneTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
              >
                {editingId ? 'Update' : 'Create'} Location
              </button>
              <button
                type="button"
                onClick={() => setShowLocationForm(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">City</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Zone Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Coordinates</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No locations configured</p>
                  </td>
                </tr>
              ) : (
                locations.map((location) => (
                  <tr key={location.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">{location.name}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{location.city}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        {location.zone_type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      ({location.latitude.toFixed(4)}, {location.longitude.toFixed(4)})
                    </td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleEditLocation(location)}
                        className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
                      >
                        <Edit2 className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(location.id)}
                        className="text-red-600 hover:text-red-700 font-medium transition-colors"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
