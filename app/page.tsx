"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import {
  getHumorFlavors,
  createHumorFlavor,
  updateHumorFlavor,
  deleteHumorFlavor,
  getHumorFlavorSteps,
  createHumorFlavorStep,
  updateHumorFlavorStep,
  deleteHumorFlavorStep,
  reorderHumorFlavorStep,
  getCaptionsForFlavor,
  getImages,
} from "@/app/actions/admin";

interface HumorFlavor {
  id: number;
  created_datetime_utc: string;
  description: string;
  slug: string;
}

interface HumorFlavorStep {
  id: number;
  humor_flavor_id: number;
  created_datetime_utc: string;
  order_by: number;
  llm_temperature: number | null;
  llm_input_type_id: number;
  llm_output_type_id: number;
  llm_model_id: number;
  humor_flavor_step_type_id: number;
  llm_system_prompt: string;
  llm_user_prompt: string;
  description: string | null;
}

interface Image {
  id: string;
  url: string;
  created_datetime_utc: string;
}

interface Caption {
  id: string;
  content: string;
  created_datetime_utc: string;
  image_id: string;
}

export default function HumorFlavorsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [flavors, setFlavors] = useState<HumorFlavor[]>([]);
  const [steps, setSteps] = useState<HumorFlavorStep[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFlavorId, setSelectedFlavorId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'steps' | 'captions' | 'test'>('steps');

  const [editingFlavorId, setEditingFlavorId] = useState<number | null>(null);
  const [editFlavorData, setEditFlavorData] = useState<{ description?: string; slug?: string }>({});
  const [showCreateFlavor, setShowCreateFlavor] = useState(false);
  const [createFlavorData, setCreateFlavorData] = useState({ description: "", slug: "" });
  const [creatingFlavor, setCreatingFlavor] = useState(false);

  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [editStepData, setEditStepData] = useState<Partial<HumorFlavorStep>>({});
  const [showCreateStep, setShowCreateStep] = useState(false);
  const [createStepData, setCreateStepData] = useState({
    order_by: 1,
    llm_temperature: 0.7,
    llm_input_type_id: 1,
    llm_output_type_id: 1,
    llm_model_id: 1,
    humor_flavor_step_type_id: 1,
    llm_system_prompt: "",
    llm_user_prompt: "",
    description: "",
  });
  const [creatingStep, setCreatingStep] = useState(false);

  const [selectedTestImageId, setSelectedTestImageId] = useState<string>("");
  const [testingFlavor, setTestingFlavor] = useState(false);
  const [showTestResults, setShowTestResults] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Check auth on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        setAuthLoading(false);
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else if (theme === 'light') {
      document.body.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    }
  }, [theme]);

  useEffect(() => {
    if (!authLoading) {
      loadFlavors();
      loadImages();
    }
  }, [authLoading]);

  useEffect(() => {
    if (selectedFlavorId && activeTab === 'captions') {
      loadCaptionsForFlavor(selectedFlavorId);
    }
  }, [selectedFlavorId, activeTab]);

  async function loadFlavors() {
    try {
      setLoading(true);
      const data = await getHumorFlavors();
      setFlavors(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load flavors");
    } finally {
      setLoading(false);
    }
  }

  async function loadImages() {
    try {
      const data = await getImages();
      setImages(data);
    } catch (err) {
      console.error("Failed to load images:", err);
    }
  }

  async function loadStepsForFlavor(flavorId: number) {
    try {
      const data = await getHumorFlavorSteps(flavorId);
      setSteps(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load steps");
    }
  }

  async function loadCaptionsForFlavor(flavorId: number) {
    try {
      const data = await getCaptionsForFlavor(flavorId);
      setCaptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load captions");
    }
  }

  async function handleCreateFlavor(e: React.FormEvent) {
    e.preventDefault();
    if (!createFlavorData.description.trim() || !createFlavorData.slug.trim()) {
      setError("Please fill in all flavor fields");
      return;
    }
    try {
      setCreatingFlavor(true);
      setError(null);
      await createHumorFlavor(createFlavorData.description, createFlavorData.slug);
      setCreateFlavorData({ description: "", slug: "" });
      setShowCreateFlavor(false);
      loadFlavors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create flavor");
    } finally {
      setCreatingFlavor(false);
    }
  }

  async function handleUpdateFlavor(flavorId: number) {
    if (!editFlavorData.description?.trim() || !editFlavorData.slug?.trim()) {
      setError("Please fill in all flavor fields");
      return;
    }
    try {
      setError(null);
      await updateHumorFlavor(flavorId, editFlavorData.description!, editFlavorData.slug!);
      setEditingFlavorId(null);
      setEditFlavorData({});
      loadFlavors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update flavor");
    }
  }

  async function handleDeleteFlavor(flavorId: number) {
    if (!window.confirm("Delete this flavor and all its steps?")) return;
    try {
      setError(null);
      await deleteHumorFlavor(flavorId);
      setSelectedFlavorId(null);
      setSteps([]);
      loadFlavors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete flavor");
    }
  }

  async function handleCreateStep(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlavorId || !createStepData.llm_system_prompt.trim() || !createStepData.llm_user_prompt.trim()) {
      setError("Please fill in required step fields");
      return;
    }
    try {
      setCreatingStep(true);
      setError(null);
      await createHumorFlavorStep(
        selectedFlavorId,
        createStepData.order_by,
        createStepData.llm_temperature,
        createStepData.llm_input_type_id,
        createStepData.llm_output_type_id,
        createStepData.llm_model_id,
        createStepData.humor_flavor_step_type_id,
        createStepData.llm_system_prompt,
        createStepData.llm_user_prompt,
        createStepData.description || null
      );
      setCreateStepData({
        order_by: 1,
        llm_temperature: 0.7,
        llm_input_type_id: 1,
        llm_output_type_id: 1,
        llm_model_id: 1,
        humor_flavor_step_type_id: 1,
        llm_system_prompt: "",
        llm_user_prompt: "",
        description: "",
      });
      setShowCreateStep(false);
      loadStepsForFlavor(selectedFlavorId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create step");
    } finally {
      setCreatingStep(false);
    }
  }

  async function handleUpdateStep(stepId: number) {
    if (!editStepData.llm_system_prompt?.trim() || !editStepData.llm_user_prompt?.trim()) {
      setError("Please fill in required step fields");
      return;
    }
    try {
      setError(null);
      const step = steps.find((s) => s.id === stepId)!;
      await updateHumorFlavorStep(
        stepId,
        editStepData.order_by ?? step.order_by,
        editStepData.llm_temperature ?? step.llm_temperature,
        editStepData.llm_input_type_id ?? step.llm_input_type_id,
        editStepData.llm_output_type_id ?? step.llm_output_type_id,
        editStepData.llm_model_id ?? step.llm_model_id,
        editStepData.humor_flavor_step_type_id ?? step.humor_flavor_step_type_id,
        editStepData.llm_system_prompt,
        editStepData.llm_user_prompt,
        editStepData.description ?? step.description
      );
      setEditingStepId(null);
      setEditStepData({});
      if (selectedFlavorId) loadStepsForFlavor(selectedFlavorId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update step");
    }
  }

  async function handleDeleteStep(stepId: number) {
    if (!window.confirm("Delete this step?")) return;
    try {
      setError(null);
      await deleteHumorFlavorStep(stepId);
      if (selectedFlavorId) loadStepsForFlavor(selectedFlavorId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete step");
    }
  }

  async function handleMoveStepUp(step: HumorFlavorStep) {
    if (step.order_by <= 1) return;
    try {
      setError(null);
      await reorderHumorFlavorStep(step.id, step.order_by - 1);
      if (selectedFlavorId) loadStepsForFlavor(selectedFlavorId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move step");
    }
  }

  async function handleMoveStepDown(step: HumorFlavorStep) {
    try {
      setError(null);
      await reorderHumorFlavorStep(step.id, step.order_by + 1);
      if (selectedFlavorId) loadStepsForFlavor(selectedFlavorId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move step");
    }
  }

  async function testFlavorAction(imageId: string, flavorId: number) {
    try {
      setTestingFlavor(true);
      setTestError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setTestError("No valid session found. Please log in again.");
        return;
      }
      
      const response = await fetch("https://api.almostcrackd.ai/pipeline/generate-captions", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId, humorFlavorId: flavorId }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        setTestError(`API failed: ${response.status} - ${errorText}`);
        return;
      }

      const result = await response.json();
      setTestResults(result);
      setShowTestResults(true);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Failed to test flavor");
    } finally {
      setTestingFlavor(false);
    }
  }

  async function handleTestFlavor() {
    if (!selectedFlavorId || !selectedTestImageId) {
      setTestError("Please select a flavor and image");
      return;
    }
    
    await testFlavorAction(selectedTestImageId, selectedFlavorId);
  }

  if (authLoading) {
    return <div style={{padding: '20px', textAlign: 'center'}}>Loading...</div>;
  }

  return (
    <div>
      <div className="header">
        <div className="flex-between">
          <div>
            <h1>🎭 Prompt Chain Tool</h1>
            <p>Manage humor flavors and steps</p>
          </div>
          <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
            <div className="theme-toggle">
              <button onClick={() => setTheme('light')} className={`theme-btn ${theme === 'light' ? 'active' : ''}`}>
                ☀️ Light
              </button>
              <button onClick={() => setTheme('dark')} className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}>
                🌙 Dark
              </button>
              <button onClick={() => setTheme('system')} className={`theme-btn ${theme === 'system' ? 'active' : ''}`}>
                💻 System
              </button>
            </div>
            <button onClick={handleLogout} className="btn btn-red" style={{whiteSpace: 'nowrap'}}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {error && (
          <div className="error">
            {error}
            <button onClick={() => setError(null)} className="link-btn">Dismiss</button>
          </div>
        )}

        <div className="flex-between">
          <h2>Flavors</h2>
          {!showCreateFlavor && (
            <button onClick={() => setShowCreateFlavor(true)} className="btn btn-green">
              + New Flavor
            </button>
          )}
        </div>

        {showCreateFlavor && (
          <div className="card form-card">
            <form onSubmit={handleCreateFlavor}>
              <input
                type="text"
                placeholder="Slug (e.g., pov-pov-pov)"
                value={createFlavorData.slug}
                onChange={(e) => setCreateFlavorData({ ...createFlavorData, slug: e.target.value })}
              />
              <textarea
                placeholder="Description"
                value={createFlavorData.description}
                onChange={(e) => setCreateFlavorData({ ...createFlavorData, description: e.target.value })}
                rows={2}
              />
              <div className="flex">
                <button type="submit" disabled={creatingFlavor} className="btn btn-green">
                  {creatingFlavor ? "Creating..." : "Create"}
                </button>
                <button type="button" onClick={() => setShowCreateFlavor(false)} className="btn btn-gray">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Slug</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {flavors.map((flavor) => (
                  <tr key={flavor.id}>
                    <td>
                      {editingFlavorId === flavor.id ? (
                        <input
                          type="text"
                          value={editFlavorData.slug ?? flavor.slug}
                          onChange={(e) => setEditFlavorData({ ...editFlavorData, slug: e.target.value })}
                        />
                      ) : (
                        flavor.slug
                      )}
                    </td>
                    <td>
                      {editingFlavorId === flavor.id ? (
                        <textarea
                          value={editFlavorData.description ?? flavor.description}
                          onChange={(e) => setEditFlavorData({ ...editFlavorData, description: e.target.value })}
                          rows={2}
                        />
                      ) : (
                        flavor.description
                      )}
                    </td>
                    <td>{new Date(flavor.created_datetime_utc).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        {editingFlavorId === flavor.id ? (
                          <>
                            <button onClick={() => handleUpdateFlavor(flavor.id)} className="action-btn action-btn-green">
                              Save
                            </button>
                            <button onClick={() => setEditingFlavorId(null)} className="action-btn">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingFlavorId(flavor.id);
                                setEditFlavorData({ description: flavor.description, slug: flavor.slug });
                              }}
                              className="action-btn action-btn-blue"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setSelectedFlavorId(flavor.id);
                                loadStepsForFlavor(flavor.id);
                                setTimeout(() => {
                                  document.getElementById('steps-section')?.scrollIntoView({ 
                                    behavior: 'smooth',
                                    block: 'start'
                                  });
                                }, 100);
                              }}
                              className="action-btn action-btn-purple"
                            >
                              View Steps
                            </button>
                            <button onClick={() => handleDeleteFlavor(flavor.id)} className="action-btn action-btn-red">
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedFlavorId && (
          <div id="steps-section" style={{marginTop: '40px', paddingTop: '40px', borderTop: '2px solid #e5e7eb'}}>
            <h2 style={{marginBottom: '20px'}}>
              {flavors.find((f) => f.id === selectedFlavorId)?.slug}
            </h2>

            <div className="tabs">
              <button onClick={() => setActiveTab('steps')} className={`tab ${activeTab === 'steps' ? 'active' : ''}`}>
                Steps
              </button>
              <button onClick={() => setActiveTab('captions')} className={`tab ${activeTab === 'captions' ? 'active' : ''}`}>
                Captions
              </button>
              <button onClick={() => setActiveTab('test')} className={`tab ${activeTab === 'test' ? 'active' : ''}`}>
                Test
              </button>
            </div>

            {activeTab === 'steps' && (
              <div>
                <div className="flex-between">
                  <div></div>
                  {!showCreateStep && (
                    <button onClick={() => setShowCreateStep(true)} className="btn btn-blue">
                      + New Step
                    </button>
                  )}
                </div>

                {showCreateStep && (
                  <div className="card form-card">
                    <form onSubmit={handleCreateStep}>
                      <div className="flex">
                        <input
                          type="number"
                          placeholder="Order"
                          value={createStepData.order_by}
                          onChange={(e) => setCreateStepData({ ...createStepData, order_by: parseInt(e.target.value) })}
                          style={{width: '50%'}}
                        />
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Temperature"
                          value={createStepData.llm_temperature}
                          onChange={(e) => setCreateStepData({ ...createStepData, llm_temperature: parseFloat(e.target.value) })}
                          style={{width: '50%'}}
                        />
                      </div>
                      <textarea
                        placeholder="System Prompt (required)"
                        value={createStepData.llm_system_prompt}
                        onChange={(e) => setCreateStepData({ ...createStepData, llm_system_prompt: e.target.value })}
                        rows={3}
                      />
                      <textarea
                        placeholder="User Prompt (required)"
                        value={createStepData.llm_user_prompt}
                        onChange={(e) => setCreateStepData({ ...createStepData, llm_user_prompt: e.target.value })}
                        rows={3}
                      />
                      <textarea
                        placeholder="Description (optional)"
                        value={createStepData.description}
                        onChange={(e) => setCreateStepData({ ...createStepData, description: e.target.value })}
                        rows={2}
                      />
                      <div className="flex">
                        <button type="submit" disabled={creatingStep} className="btn btn-blue">
                          {creatingStep ? "Creating..." : "Create"}
                        </button>
                        <button type="button" onClick={() => setShowCreateStep(false)} className="btn btn-gray">
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="card">
                  <table>
                    <thead>
                      <tr>
                        <th style={{width: '60px'}}>Order</th>
                        <th style={{width: '80px'}}>Temp</th>
                        <th>System Prompt</th>
                        <th>User Prompt</th>
                        <th style={{width: '280px'}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {steps.map((step, i) => (
                        <tr key={step.id}>
                          <td>
                            {editingStepId === step.id ? (
                              <input
                                type="number"
                                value={editStepData.order_by ?? step.order_by}
                                onChange={(e) => setEditStepData({ ...editStepData, order_by: parseInt(e.target.value) })}
                                style={{width: '50px'}}
                              />
                            ) : (
                              step.order_by
                            )}
                          </td>
                          <td>
                            {editingStepId === step.id ? (
                              <input
                                type="number"
                                step="0.1"
                                value={editStepData.llm_temperature ?? step.llm_temperature ?? 0.7}
                                onChange={(e) => setEditStepData({ ...editStepData, llm_temperature: parseFloat(e.target.value) })}
                                style={{width: '60px'}}
                              />
                            ) : (
                              step.llm_temperature?.toFixed(2)
                            )}
                          </td>
                          <td style={{maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                            {editingStepId === step.id ? (
                              <textarea
                                value={editStepData.llm_system_prompt ?? step.llm_system_prompt}
                                onChange={(e) => setEditStepData({ ...editStepData, llm_system_prompt: e.target.value })}
                                rows={2}
                              />
                            ) : (
                              step.llm_system_prompt.substring(0, 100) + '...'
                            )}
                          </td>
                          <td style={{maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                            {editingStepId === step.id ? (
                              <textarea
                                value={editStepData.llm_user_prompt ?? step.llm_user_prompt}
                                onChange={(e) => setEditStepData({ ...editStepData, llm_user_prompt: e.target.value })}
                                rows={2}
                              />
                            ) : (
                              step.llm_user_prompt.substring(0, 100) + '...'
                            )}
                          </td>
                          <td>
                            <div className="action-buttons">
                              {editingStepId === step.id ? (
                                <>
                                  <button onClick={() => handleUpdateStep(step.id)} className="action-btn action-btn-green">Save</button>
                                  <button onClick={() => setEditingStepId(null)} className="action-btn">Cancel</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => handleMoveStepUp(step)} disabled={i === 0} className="action-btn">↑</button>
                                  <button onClick={() => handleMoveStepDown(step)} disabled={i === steps.length - 1} className="action-btn">↓</button>
                                  <button onClick={() => { setEditingStepId(step.id); setEditStepData({ ...step }); }} className="action-btn action-btn-blue">Edit</button>
                                  <button onClick={() => handleDeleteStep(step.id)} className="action-btn action-btn-red">Delete</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {steps.length === 0 && <p style={{textAlign: 'center', padding: '20px', color: '#999'}}>No steps yet</p>}
                </div>
              </div>
            )}

            {activeTab === 'captions' && (
              <div className="card">
                <h3 style={{marginBottom: '15px'}}>Captions produced by this flavor</h3>
                {captions.length > 0 ? (
                  <div>
                    {captions.map((caption) => (
                      <div key={caption.id} style={{padding: '15px', background: '#f9fafb', borderRadius: '6px', marginBottom: '10px'}}>
                        <p>{caption.content}</p>
                        <p className="text-xs" style={{marginTop: '10px', color: '#999'}}>
                          {new Date(caption.created_datetime_utc).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{color: '#999'}}>No captions found for this flavor.</p>
                )}
              </div>
            )}

            {activeTab === 'test' && (
              <div className="card">
                <h3 style={{marginBottom: '15px'}}>Test Humor Flavor</h3>
                {testError && <div className="error">{testError}</div>}
                <div>
                  <label className="mb-10">Select Test Image</label>
                  <select
                    value={selectedTestImageId}
                    onChange={(e) => setSelectedTestImageId(e.target.value)}
                  >
                    <option value="">-- Choose an image --</option>
                    {images.filter(img => img.url).map((img) => (
                      <option key={img.id} value={img.id}>
                        {img.url.substring(img.url.lastIndexOf('/') + 1)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleTestFlavor}
                    disabled={testingFlavor || !selectedTestImageId}
                    className="btn btn-blue"
                    style={{marginTop: '15px', width: '100%'}}
                  >
                    {testingFlavor ? "Testing..." : "Test Humor Flavor"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showTestResults && testResults && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Test Results</h2>
              <button onClick={() => setShowTestResults(false)} style={{background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'}}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <pre>{JSON.stringify(testResults, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}