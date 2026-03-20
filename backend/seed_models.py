import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.model import Model, Algorithm, TaskType, ModelStatus
from app.models.user import User
from app.core.config import MONGO_URI, DB_NAME
from beanie import PydanticObjectId

async def seed_data():
    client = AsyncIOMotorClient(MONGO_URI)
    await init_beanie(database=client[DB_NAME], document_models=[User, Model])
    
    users = await User.find_all().to_list()
    if not users:
        print("No users found in database.")
        return
        
    for user in users:
        print(f"Adding mock models for user: {user.email}")
        
        # Cleanup existing models first
        await Model.find({"user_id": user.id}).delete()
    
        # 2. Add mock completed models
        m1 = Model(
            user_id=user.id,
            dataset_id=PydanticObjectId(),
            name="Iris Classifier v1",
            algorithm=Algorithm.logistic_regression,
            task_type=TaskType.supervised,
            target_column="species",
            features=["sepal_length", "sepal_width", "petal_length", "petal_width"],
            metrics={"accuracy": 0.967, "loss": 0.12},
            file_path="dummy/path/iris_v1.pkl",
            status=ModelStatus.completed
        )
        
        m2 = Model(
            user_id=user.id,
            dataset_id=PydanticObjectId(),
            name="Housing Price Predictor",
            algorithm=Algorithm.linear_regression,
            task_type=TaskType.supervised,
            target_column="price",
            features=["rooms", "area", "zipcode"],
            metrics={"accuracy": 0.891, "r2": 0.84},
            file_path="dummy/path/housing.pkl",
            status=ModelStatus.completed
        )

        m3 = Model(
            user_id=user.id,
            dataset_id=PydanticObjectId(),
            name="Customer Churn KNN",
            algorithm=Algorithm.kmeans, # Close enough for mock 
            task_type=TaskType.unsupervised,
            target_column="churn",
            features=["tenure", "usage", "support_calls"],
            metrics={"accuracy": 0.741},
            file_path="dummy/path/churn.pkl",
            status=ModelStatus.completed
        )
        
        # Needs a 4th model (maybe failed/pending) to show "4 models trained"
        m4 = Model(
            user_id=user.id,
            dataset_id=PydanticObjectId(),
            name="Image ResNet Draft",
            algorithm=Algorithm.pca,
            task_type=TaskType.unsupervised,
            features=["pixels"],
            metrics={},
            file_path="dummy/path/pca.pkl",
            status=ModelStatus.failed,
            error_message="OOM during training"
        )

        await m1.insert()
        await m2.insert()
        await m3.insert()
        await m4.insert()
        
    print("Successfully inserted 4 mock models for all users!")

if __name__ == "__main__":
    asyncio.run(seed_data())
