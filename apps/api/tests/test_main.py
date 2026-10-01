def test_health_check(client):
    """
    Test that the health check endpoint returns 200 OK and expected structure.
    """
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "initialized" in data["message"]


def test_not_found(client):
    """
    Test that requesting a non-existent endpoint returns 404.
    """
    response = client.get("/invalid-route-name-path-xyz")
    assert response.status_code == 404
